import {
  Contract,
  contractTableName,
  EventListener,
  eventListenerTableName,
} from '@models/Contract/Entity';
import { Router, Request, Response, NextFunction } from 'express';
import container from '@container';
import { json } from 'body-parser';
import { BigNumber as BN } from 'bignumber.js';
import { historySyncTableName } from '@models/Interaction/Entity';

const contractState = (
  data: any,
): {
  name: string | Error;
  network: number | Error;
  address: string | Error;
  startHeight: number | Error;
  abi: any[] | Error;
} => {
  const state: ReturnType<typeof contractState> = {
    name: new Error('Invalid name'),
    network: new Error('Invalid network'),
    address: new Error('Invalid address'),
    startHeight: new Error('Invalid start height'),
    abi: new Error('Invalid ABI'),
  };

  const { name, network, address, startHeight, abi } = data;
  if (typeof name === 'string' && name !== '') {
    state.name = name;
  }
  if (!Number.isNaN(Number(network))) {
    state.network = Number(network);
  }
  if (typeof address === 'string' && /0x[a-z0-9]{40}/i.test(address)) {
    state.address = address;
  }
  if (!Number.isNaN(Number(startHeight))) {
    state.startHeight = Number(startHeight);
  }
  if (typeof abi === 'string') {
    state.abi = JSON.parse(abi);
  }

  return state;
};

const eventListenerState = (data: any): { name: string | Error } => {
  const state: ReturnType<typeof eventListenerState> = {
    name: new Error('Invalid name'),
  };

  const { name } = data;
  if (typeof name === 'string' && name !== '') {
    state.name = name;
  }

  return state;
};

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
    const { network } = req.query;
    const { address } = req.query;
    const { name } = req.query;

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
  .post('/', json(), async (req, res) => {
    const { name, network, address, startHeight, abi } = contractState(req.body);
    if (name instanceof Error) {
      return res.status(400).send(name.message);
    }
    if (network instanceof Error) {
      return res.status(400).send(network.message);
    }
    if (address instanceof Error) {
      return res.status(400).send(address.message);
    }
    if (startHeight instanceof Error) {
      return res.status(400).send(startHeight.message);
    }
    if (abi instanceof Error) {
      return res.status(400).send(abi.message);
    }

    const contract = await container.model
      .contractService()
      .createContract(network, address, name, abi, startHeight);

    return res.json(contract);
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
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const { contract } = req.params;
      const { name, network, address, startHeight, abi } = contractState(req.body);

      const updated = await container.model.contractService().updateContract({
        ...contract,
        name: name instanceof Error ? contract.name : name,
        network: network instanceof Error ? contract.network : network,
        address: address instanceof Error ? contract.address : address,
        startHeight: startHeight instanceof Error ? contract.startHeight : startHeight,
        abi: abi instanceof Error ? contract.abi : abi,
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
        this.where('contract', req.params.contract.id);
        if (typeof name === 'string' && name !== '') {
          this.andWhere('name', name);
        }
      });
      if (isCount) {
        return res.json(await select.count().first());
      }

      const provider = container.blockchain.byNetwork(req.params.contract.network).provider();
      const currentBlock = await provider.getBlockNumber();

      const eventListenersList = await select
        .column(`${eventListenerTableName}.*`)
        .column(`${contractTableName}.name as contractName`)
        .column(`${historySyncTableName}.syncHeight`)
        .column(`${historySyncTableName}.updatedAt as syncAt`)
        .innerJoin(
          contractTableName,
          `${eventListenerTableName}.contract`,
          `${contractTableName}.id`,
        )
        .leftJoin(
          historySyncTableName,
          `${eventListenerTableName}.id`,
          `${historySyncTableName}.eventListener`,
        )
        .orderBy(`${eventListenerTableName}.createdAt`, 'asc')
        .limit(limit)
        .offset(offset);

      return res.json(
        eventListenersList.map((eventListener) => {
          const syncHeight = eventListener.syncHeight ?? 0;
          return {
            ...eventListener,
            sync: {
              currentBlock,
              syncHeight,
              progress: Number(
                new BN(syncHeight)
                  .minus(req.params.contract.startHeight)
                  .div(new BN(currentBlock).minus(req.params.contract.startHeight))
                  .multipliedBy(100)
                  .toFixed(0),
              ),
            },
          };
        }),
      );
    },
  )
  .post(
    '/:contractId/event-listener',
    [json(), contractMiddleware],
    async (req: Request<ContractReqParams>, res: Response) => {
      const { name } = eventListenerState(req.body);
      if (name instanceof Error) {
        return res.status(400).send(name.message);
      }

      const eventListener = await container.model
        .contractService()
        .createListener(req.params.contract, name);

      return res.json(eventListener);
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
    [json(), contractMiddleware, listenerMiddleware],
    async (req: Request<ContractReqParams & ListenerReqParams>, res: Response) => {
      const { name } = eventListenerState(req.body);
      if (name instanceof Error) {
        return res.status(400).send(name.message);
      }

      const updated = await container.model.contractService().updateListener({
        ...req.params.listener,
        name,
      });

      return res.json(updated);
    },
  )
  .get(
    '/:contractId/event-listener/:listenerId',
    [contractMiddleware, listenerMiddleware],
    (req: Request<ContractReqParams & ListenerReqParams>, res: Response) =>
      res.json(req.params.listener),
  );
