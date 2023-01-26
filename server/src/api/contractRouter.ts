import {
  Contract,
  contractTableName,
  EventListener,
  eventListenerTableName,
} from '@models/Contract/Entity';
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import * as tg from 'type-guards';
import { Unshape } from 'type-guards/dist/es2015/types';
import container from '@container';
import { json } from 'body-parser';
import {
  historySyncTableName,
  promptlySyncTableName,
  HistorySync,
} from '@models/Interaction/Entity';
import { ethers } from 'ethers';

namespace Verify {
  export function bodyVerify<T, P = ParamsDictionary>(
    guard: tg.Guard<T>,
  ): RequestHandler<P, any, T> {
    return (req, res, next) => {
      try {
        return guard(req.body) ? next() : res.status(400).send('Invalid request body');
      } catch (e) {
        let message;
        if (e instanceof Error) {
          message = e instanceof TypeError ? `${e.message} "${e.value}"` : e.message;
        } else {
          message = String(e);
        }
        const status = e instanceof Verify.TypeError ? 400 : 500;
        return res.status(status).send(message);
      }
    };
  }

  export class TypeError extends Error {
    constructor(message: string, public readonly value: any) {
      super(message);
      Object.setPrototypeOf(this, TypeError.prototype);
    }
  }

  export const throwIf =
    <T>(guard: tg.Guard<T>, error: string) =>
    (v: any): v is T => {
      if (!guard(v)) throw new TypeError(error, v);
      return true;
    };

  export type EthereumAddress = string;

  export const isNotEmpty = (v: any): v is string => typeof v === 'string' && v !== '';

  export const isEthereumAddress = (v: any): v is EthereumAddress => ethers.utils.isAddress(v);

  export const isABI = (v: any): v is string => {
    if (typeof v !== 'string') return false;
    try {
      JSON.parse(v);
      return true;
    } catch {
      return false;
    }
  };

  export function isOfShape<V extends tg.Dict, T extends tg.Shape<V> = tg.Shape<V>>(
    shape: T,
  ): tg.GuardWithShape<Unshape<T>> {
    const fn = (input: any): input is Unshape<T> =>
      input !== null &&
      typeof input === 'object' &&
      Object.keys(shape).every((key) => {
        const keyGuard = shape[key];
        if (typeof keyGuard === 'function') {
          return keyGuard(input[key]);
        }
        if (typeof keyGuard === 'object') {
          return isOfShape(keyGuard)(input[key]);
        }
        return false;
      });
    fn.shape = shape;
    fn.exact = false;
    return fn;
  }

  export const isContractCreateRequest = isOfShape({
    name: throwIf(isNotEmpty, 'Invalid name'),
    network: throwIf(tg.isNumber, 'Invalid network'),
    address: throwIf(isEthereumAddress, 'Invalid address'),
    startHeight: throwIf(tg.isNumber, 'Invalid start height'),
    abi: throwIf(isABI, 'Invalid ABI'),
  });

  export const isContractUpdateRequest = isOfShape({
    name: throwIf(tg.isOneOf(isNotEmpty, tg.isUndefined), 'Invalid name'),
    network: throwIf(tg.isOneOf(tg.isNumber, tg.isUndefined), 'Invalid network'),
    address: throwIf(tg.isOneOf(isEthereumAddress, tg.isUndefined), 'Invalid address'),
    startHeight: throwIf(tg.isOneOf(tg.isNumber, tg.isUndefined), 'Invalid start height'),
    abi: throwIf(tg.isOneOf(isABI, tg.isUndefined), 'Invalid ABI'),
    enabled: throwIf(tg.isOneOf(tg.isBoolean, tg.isUndefined), 'Invalid enabled flag'),
  });

  export const isEventListenerCreateRequest = isOfShape({
    name: throwIf(isNotEmpty, 'Invalid name'),
  });

  export const isHistoryScannerCreateRequest = isOfShape({
    syncHeight: throwIf(tg.isNumber, 'Invalid sync height'),
    endHeight: throwIf(tg.isOneOf(tg.isNumber, tg.isNull), 'Invalid end height'),
    saveEvents: throwIf(tg.isBoolean, 'Invalid save events flag'),
  });

  export const isHistoryScannerUpdateRequest = isOfShape({
    syncHeight: throwIf(tg.isOneOf(tg.isNumber, tg.isUndefined), 'Invalid sync height'),
    endHeight: throwIf(tg.isOneOf(tg.isNumber, tg.isNullOrUndefined), 'Invalid end height'),
    saveEvents: throwIf(tg.isOneOf(tg.isBoolean, tg.isUndefined), 'Invalid save events flag'),
  });
}

interface ContractReqParams {
  contractId: string;
  contract: Contract;
}

async function contractMiddleware(
  req: Request<ContractReqParams>,
  res: Response,
  next: NextFunction,
) {
  const contract = await container.model.contractTable().where('id', req.params.contractId).first();
  if (!contract) return res.status(404).send('Contract not found');

  req.params.contract = contract;

  return next();
}

interface ListenerReqParams {
  listenerId: string;
  listener: EventListener;
}

async function listenerMiddleware(
  req: Request<ListenerReqParams>,
  res: Response,
  next: NextFunction,
) {
  const listener = await container.model
    .contractEventListenerTable()
    .where('id', req.params.listenerId)
    .first();
  if (!listener) return res.status(404).send('Event listener not found');

  req.params.listener = listener;

  return next();
}

export default Router()
  .get('/', async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const offset = Number(req.query.offset ?? 0);
    const isCount = req.query.count === 'yes';
    const { network, address, name } = req.query;

    const networkFilter = Number(network) || null;
    const addressFilter =
      typeof address === 'string' && address !== '' ? address.toLowerCase() : null;
    const nameFilter = typeof name === 'string' && name !== '' ? name : null;

    const select = container.model.contractTable().where(function () {
      if (networkFilter) {
        this.andWhere('network', networkFilter);
      }
      if (addressFilter) {
        this.andWhere('address', addressFilter);
      }
      if (nameFilter) {
        this.andWhere('name', 'ilike', `%${nameFilter}%`);
      }
    });
    if (isCount) {
      return res.json(await select.count().first());
    }

    return res.json(await select.limit(limit).offset(offset));
  })
  .get('/progress', async (req, res) => {
    const contractsId = Array.isArray(req.query.contracts)
      ? req.query.contracts
      : [req.query.contracts];
    const normalContractsId = contractsId
      .filter((v): v is string => v !== undefined)
      .map((v) => String(v));
    if (normalContractsId.length === 0) {
      return res.json({});
    }

    const histories = await container.model
      .historySyncTable()
      .column(`${contractTableName}.network`)
      .column(`${eventListenerTableName}.contract`)
      .column<Array<HistorySync & { contract: string; network: number }>>(
        `${historySyncTableName}.*`,
      )
      .innerJoin(
        eventListenerTableName,
        `${eventListenerTableName}.id`,
        `${historySyncTableName}.eventListener`,
      )
      .innerJoin(contractTableName, `${contractTableName}.id`, `${eventListenerTableName}.contract`)
      .whereIn(`${eventListenerTableName}.contract`, normalContractsId)
      .whereNull(`${historySyncTableName}.endHeight`);

    const currentBlockMap = new Map<number, number>();
    return res.json(
      await histories.reduce<
        Promise<Record<string, { currentBlock: number; syncHeight: number; saveEvents: boolean }>>
      >(async (prev, { contract, syncHeight, network, saveEvents }) => {
        const map = await prev;

        let currentBlock = currentBlockMap.get(network);
        if (!currentBlock) {
          currentBlock = await container.blockchain.byNetwork(network).provider().getBlockNumber();
          currentBlockMap.set(network, currentBlock);
        }

        return {
          ...map,
          [contract]: {
            currentBlock,
            syncHeight,
            saveEvents,
          },
        };
      }, Promise.resolve({})),
    );
  })
  .post('/', json(), Verify.bodyVerify(Verify.isContractCreateRequest), async (req, res) => {
    const { name, network, address, startHeight, abi } = req.body;
    const created = await container.model
      .contractService()
      .createContract(network, address, name, JSON.parse(abi), startHeight);
    return res.json(created);
  })
  .get('/:contractId', [contractMiddleware], (req: Request<ContractReqParams>, res: Response) =>
    res.json(req.params.contract),
  )
  .get(
    '/:contractId/statistics',
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const uniqueWalletsCount = await container.model
        .walletInteractionTable()
        .countDistinct('wallet')
        .where('network', req.params.contract.network)
        .where('contract', req.params.contract.address.toLowerCase())
        .first()
        .then((row) => Number(row ? row.count : '0'));

      return res.json({
        uniqueWalletsCount,
      });
    },
  )
  .delete(
    '/:contractId',
    [contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      await container.model.contractService().deleteContract(req.params.contract);

      return res.status(200).send('');
    },
  )
  .put(
    '/:contractId',
    json(),
    Verify.bodyVerify(Verify.isContractUpdateRequest),
    contractMiddleware,
    async (req: Request<ContractReqParams>, res: Response) => {
      const { contract } = req.params;
      const { name, network, address, startHeight, abi, enabled } = req.body;
      const updated = await container.model.contractService().updateContract({
        ...contract,
        name: name ?? contract.name,
        network: network ?? contract.network,
        address: address ?? contract.address,
        startHeight: startHeight ?? contract.startHeight,
        abi: abi ? JSON.parse(abi) : contract.abi,
        enabled: enabled ?? contract.enabled,
      });
      return res.json(updated);
    },
  )
  .get(
    '/:contractId/event-listener',
    [contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const limit = Number(req.query.limit ?? 10);
      const offset = Number(req.query.offset ?? 0);
      const isCount = req.query.count === 'yes';
      const { name } = req.query;

      const select = container.model.contractEventListenerTable().where(function () {
        this.where(`${eventListenerTableName}.contract`, req.params.contract.id);
        if (typeof name === 'string' && name !== '') {
          this.andWhere(`${eventListenerTableName}.name`, name);
        }
      });
      if (isCount) {
        return res.json(await select.count().first());
      }

      const eventListenersList = await select
        .columns<Array<EventListener & { contractName: string; promptlyId: string }>>([
          `${eventListenerTableName}.*`,
          `${contractTableName}.name as contractName`,
          `${promptlySyncTableName}.id as promptlyId`,
        ])
        .innerJoin(
          contractTableName,
          `${eventListenerTableName}.contract`,
          `${contractTableName}.id`,
        )
        .leftJoin(
          promptlySyncTableName,
          `${eventListenerTableName}.id`,
          `${promptlySyncTableName}.eventListener`,
        )
        .orderBy(`${eventListenerTableName}.createdAt`, 'asc')
        .limit(limit)
        .offset(offset);

      return res.json(eventListenersList);
    },
  )
  .get(
    '/:contractId/event-listener/:listenerId',
    [contractMiddleware, listenerMiddleware],
    (req: Request<ContractReqParams & ListenerReqParams>, res: Response) =>
      res.json(req.params.listener),
  )
  .post(
    '/:contractId/event-listener',
    json(),
    Verify.bodyVerify(Verify.isEventListenerCreateRequest),
    contractMiddleware,
    async (req: Request<ContractReqParams>, res: Response) => {
      const { name } = req.body;
      const created = await container.model
        .contractService()
        .createListener(req.params.contract, name);
      return res.json(created);
    },
  )
  .delete(
    '/:contractId/event-listener/:listenerId',
    [contractMiddleware, listenerMiddleware],
    async (req: Request<ContractReqParams & ListenerReqParams>, res: Response) => {
      await container.model.contractService().deleteListener(req.params.listener);

      return res.status(200).send('');
    },
  )
  .put(
    '/:contractId/event-listener/:listenerId',
    json(),
    contractMiddleware,
    listenerMiddleware,
    async (req: Request<ContractReqParams & ListenerReqParams>, res: Response) => {
      const { promptly } = req.body;
      if (tg.isNullOrUndefined(promptly)) {
        await container.model.interactionService().deletePromptlySync(req.params.listener);
      } else {
        await container.model.interactionService().createPromptlySync(req.params.listener);
      }
      return res.json(true);
    },
  )
  .get(
    '/:contractId/event-listener/:listenerId/history',
    [json(), contractMiddleware, listenerMiddleware],
    async (req: Request<ContractReqParams & ListenerReqParams>, res: Response) => {
      const limit = Number(req.query.limit ?? 10);
      const offset = Number(req.query.offset ?? 0);
      const isCount = req.query.count === 'yes';

      const select = container.model
        .historySyncTable()
        .where(`${historySyncTableName}.eventListener`, req.params.listener.id);
      if (isCount) {
        return res.json(await select.count().first());
      }

      const currentBlock = await container.blockchain
        .byNetwork(req.params.contract.network)
        .provider()
        .getBlockNumber();

      return res.json(
        await select
          .orderBy(`${historySyncTableName}.createdAt`, 'asc')
          .limit(limit)
          .offset(offset)
          .then((list) =>
            list.map((history) => ({
              ...history,
              sync: { currentBlock },
            })),
          ),
      );
    },
  )
  .post(
    '/:contractId/event-listener/:listenerId/history',
    json(),
    Verify.bodyVerify(Verify.isHistoryScannerCreateRequest),
    contractMiddleware,
    listenerMiddleware,
    async (req: Request<ContractReqParams & ListenerReqParams>, res: Response) => {
      const { syncHeight, endHeight, saveEvents } = req.body;
      const created = await container.model
        .interactionService()
        .createHistorySync(req.params.listener, syncHeight, endHeight, saveEvents);
      return res.json(created);
    },
  )
  .put(
    '/:contractId/event-listener/:listenerId/history/:historyId',
    json(),
    Verify.bodyVerify(Verify.isHistoryScannerUpdateRequest),
    contractMiddleware,
    listenerMiddleware,
    async (
      req: Request<ContractReqParams & ListenerReqParams & { historyId: string }>,
      res: Response,
    ) => {
      const history = await container.model
        .historySyncTable()
        .where('id', req.params.historyId)
        .first();
      if (!history) {
        return res.status(404).send('');
      }

      const { syncHeight, endHeight, saveEvents } = req.body;
      const updated = await container.model.interactionService().updateHistorySync({
        ...history,
        syncHeight: syncHeight ?? history.syncHeight,
        endHeight: endHeight !== undefined ? endHeight : history.endHeight,
        saveEvents: saveEvents ?? history.saveEvents,
      });
      return res.json(updated);
    },
  )
  .delete(
    '/:contractId/event-listener/:listenerId/history/:historyId',
    [json(), contractMiddleware, listenerMiddleware],
    async (
      req: Request<ContractReqParams & ListenerReqParams & { historyId: string }>,
      res: Response,
    ) => {
      const history = await container.model
        .historySyncTable()
        .where('id', req.params.historyId)
        .first();
      if (!history) {
        return res.status(404).send('');
      }

      await container.model.interactionService().deleteHistoricalSync(history);
      return res.status(200).send('');
    },
  );
