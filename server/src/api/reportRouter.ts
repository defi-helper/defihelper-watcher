import { Router } from 'express';
import container from '@container';
import { contractTableName, eventListenerTableName } from '@models/Contract/Entity';
import { historySyncTableName } from '@models/Interaction/Entity';
import { BigNumber as BN } from 'bignumber.js';

export default Router()
  .get('/sync-progress', async (req, res) => {
    const networks = Array.from(Object.keys(container.blockchain.networks));
    const report = await Promise.all(
      networks.map(async (networkId) => ({
        network: Number(networkId),
        blockNumber: await container.blockchain.byNetwork(networkId).provider().getBlockNumber(),
        contractsCount: await container.model
          .contractTable()
          .count()
          .where('network', networkId)
          .first()
          .then((v) => Number((v ?? { count: '0' }).count)),
        listenersCount: await container.model
          .contractEventListenerTable()
          .innerJoin(
            contractTableName,
            `${eventListenerTableName}.contract`,
            `${contractTableName}.id`,
          )
          .countDistinct(`${eventListenerTableName}.id`)
          .where(`${contractTableName}.network`, networkId)
          .first()
          .then((v) => Number((v ?? { count: '0' }).count)),
        progress: await container.model
          .historySyncTable()
          .max(`${historySyncTableName}.syncHeight`)
          .min(`${historySyncTableName}.syncHeight`)
          .innerJoin(
            eventListenerTableName,
            `${historySyncTableName}.eventListener`,
            `${eventListenerTableName}.id`,
          )
          .innerJoin(
            contractTableName,
            `${eventListenerTableName}.contract`,
            `${contractTableName}.id`,
          )
          .where(`${contractTableName}.network`, networkId)
          .first()
          .then((v) => v ?? { max: 0, min: 0 }),
      })),
    );

    return res.json(report);
  })
  .get('/sync-progress/:network', async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const offset = Number(req.query.offset ?? 0);
    const { network } = req.params;

    const select = container.model
      .contractEventListenerTable()
      .innerJoin(contractTableName, `${eventListenerTableName}.contract`, `${contractTableName}.id`)
      .where(`${contractTableName}.network`, network);

    const provider = container.blockchain.byNetwork(network).provider();
    const currentBlock = await provider.getBlockNumber();

    const eventListenersList = await select
      .clone()
      .column(`${eventListenerTableName}.*`)
      .column(`${contractTableName}.name as contractName`)
      .column(`${historySyncTableName}.syncHeight`)
      .column(`${historySyncTableName}.updatedAt as syncAt`)
      .leftJoin(
        historySyncTableName,
        `${eventListenerTableName}.id`,
        `${historySyncTableName}.eventListener`,
      )
      .orderBy(`${historySyncTableName}.syncHeight`, 'asc')
      .limit(limit)
      .offset(offset);

    return res.json({
      count: await select
        .clone()
        .count()
        .first()
        .then((row) => row ?? { count: 0 })
        .then(({ count }) => Number(count)),
      list: eventListenersList.map((eventListener) => {
        const syncHeight = eventListener.syncHeight ?? 0;
        return {
          ...eventListener,
          sync: {
            currentBlock,
            syncHeight,
            progress: Number(new BN(syncHeight).div(currentBlock).multipliedBy(100).toFixed(0)),
          },
        };
      }),
    });
  });
