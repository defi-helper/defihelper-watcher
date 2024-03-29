import 'source-map-support/register';
import 'module-alias/register';
import cli from 'command-line-args';
import { ethers } from 'ethers';
import process from 'process';
import container from '@container';
import { contractTableName, eventListenerTableName } from '@models/Contract/Entity';
import { promptlySyncTableName } from '@models/Interaction/Entity';

const options = cli([
  { name: 'network', alias: 'n', type: Number },
  { name: 'chunk', alias: 'c', type: Number, defaultValue: 100 },
  { name: 'interval', alias: 'i', type: Number, defaultValue: 2000 },
  { name: 'priority', alias: 'p', type: Number, defaultValue: 5 },
  { name: 'expiration', alias: 'e', type: Number, defaultValue: 0 },
]);
if (options.network <= 0) {
  throw new Error(`Invalid network: ${options.network}`);
}
if (options.chunk <= 0) {
  throw new Error(`Invalid chunk: ${options.chunk}`);
}
if (options.interval <= 0) {
  throw new Error(`Invalid interval: ${options.interval}`);
}
if (options.priority < 0 || options.priority > 255) {
  throw new Error(`Invalid priority: ${options.priority}`);
}
if (options.expiration < 0) {
  throw new Error(`Invalid expiration: ${options.expiration}`);
}

function normalizeEvent({
  blockNumber,
  blockHash,
  transactionHash,
  transactionIndex,
  address,
  event,
  args,
}: ethers.Event) {
  return {
    blockHash,
    blockNumber,
    transactionHash,
    transactionIndex,
    address,
    event,
    args: Object.entries(args ?? {}).reduce(
      (result, [name, value]) =>
        Number.isNaN(Number(name))
          ? {
              ...result,
              [name]: value instanceof ethers.BigNumber ? value.toString() : value,
            }
          : result,
      {},
    ),
  };
}

const provider = container.blockchain.byNetwork(options.network).provider();
const rabbit = container.rabbitmq();
rabbit.on('disconnected', () => {
  throw new Error('Rabbit disconnected');
});
const cache = container.cache();
const logger = container.logger();

const select = container.model
  .contractTable()
  .innerJoin(
    eventListenerTableName,
    `${contractTableName}.id`,
    `${eventListenerTableName}.contract`,
  )
  .innerJoin(
    promptlySyncTableName,
    `${eventListenerTableName}.id`,
    `${promptlySyncTableName}.eventListener`,
  )
  .where('network', options.network)
  .whereNotNull('abi');
let isConsume = false;
let isStoped = false;
(async function resolve(start: number) {
  if (isStoped) return;
  isConsume = true;
  try {
    const [currentBlock, chunksCount] = await Promise.all([
      provider.getBlockNumber(),
      select
        .clone()
        .countDistinct(`${contractTableName}.id`)
        .first()
        .then((v) => Math.ceil(Number((v ?? { count: '0' }).count) / options.chunk)),
    ]);
    if (chunksCount > 10) {
      logger.warn(
        `Too many chunks on events resolver. Chunks count: ${chunksCount} with chunk length: ${options.chunk}`,
      );
    }
    await Promise.all(
      Array.from(new Array(chunksCount).keys()).map(async (offset) => {
        const contracts = await select
          .clone()
          .distinctOn([`${contractTableName}.id`])
          .columns([
            `${contractTableName}.id`,
            `${contractTableName}.abi`,
            `${contractTableName}.network`,
            `${contractTableName}.address`,
          ])
          .offset(offset)
          .limit(options.chunk);

        return Promise.all(
          contracts.map(async ({ id, abi, network, address }) => {
            const contract = container.blockchain.contract(address, abi, provider);
            const listeners = await container.model
              .contractEventListenerTable()
              .columns(`${eventListenerTableName}.*`)
              .innerJoin(
                promptlySyncTableName,
                `${eventListenerTableName}.id`,
                `${promptlySyncTableName}.eventListener`,
              )
              .where('contract', id);
            return Promise.all(
              listeners.map(async (listener) => {
                const cacheKey = `eventListener:${listener.id}:syncHeight`;
                const syncHeight = await cache.get(cacheKey).then((v) => Number(v ?? '0'));
                if (syncHeight === 0 || currentBlock - syncHeight > 5) {
                  return cache.setex(cacheKey, 3600, currentBlock);
                }
                if (currentBlock <= syncHeight) {
                  return null;
                }
                if (typeof contract.filters[listener.name] !== 'function') {
                  return null;
                }

                const events = await contract.queryFilter(
                  contract.filters[listener.name](),
                  syncHeight,
                  currentBlock,
                );
                await cache.setex(cacheKey, 3600, currentBlock + 1);
                if (events.length === 0) return null;

                return rabbit.publishTopic(
                  `scanner.events.${options.network}`,
                  {
                    contract: {
                      id,
                      network,
                      address,
                    },
                    listener: {
                      id: listener.id,
                      name: listener.name,
                    },
                    from: syncHeight,
                    to: currentBlock,
                    events: events.map(normalizeEvent),
                  },
                  {
                    priority: options.priority,
                    expiration: options.expiration,
                  },
                );
              }),
            );
          }),
        );
      }),
    );
  } catch (e) {
    logger.error(`${e}`);
  }
  if (isStoped) rabbit.close();

  isConsume = false;
  const end = Date.now();
  const duration = end - start;
  if (options.interval > duration) {
    setTimeout(() => resolve(Date.now()), options.interval - duration);
  } else {
    logger.warn(
      `Too many operations on events resolver. Duration: ${duration} with target interval: ${options.interval}`,
    );
    resolve(end);
  }
})(Date.now());

process.on('SIGTERM', () => {
  isStoped = true;
  if (!isConsume) rabbit.close();
});
