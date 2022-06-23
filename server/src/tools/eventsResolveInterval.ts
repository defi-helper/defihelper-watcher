import 'source-map-support/register';
import 'module-alias/register';
import cli from 'command-line-args';
import { ethers } from 'ethers';
import process from 'process';
import container from '@container';
import { eventListenerTableName } from '@models/Contract/Entity';
import { promptlySyncTableName } from '@models/Interaction/Entity';

const options = cli([
  { name: 'network', alias: 'n', type: Number },
  { name: 'priority', alias: 'p', type: Number, defaultValue: 5 },
  { name: 'listener', alias: 'l', type: String },
  { name: 'interval', alias: 'i', type: String },
]);
if (options.network <= 0) {
  throw new Error(`Invalid network: ${options.network}`);
}
if (options.priority < 0 || options.priority > 255) {
  throw new Error(`Invalid priority: ${options.priority}`);
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

container.model
  .migrationService()
  .up()
  .then(async () => {
    const provider = container.blockchain.byNetwork(options.network).provider();
    const rabbit = container.rabbitmq();
    rabbit.on('disconnected', () => {
      throw new Error('Rabbit disconnected');
    });
    const logger = container.logger();

    const listener = await container.model
      .contractEventListenerTable()
      .column(`${eventListenerTableName}.*`)
      .innerJoin(
        promptlySyncTableName,
        `${eventListenerTableName}.id`,
        `${promptlySyncTableName}.eventListener`,
      )
      .where(`${eventListenerTableName}.id`, options.listener)
      .first();
    if (!listener) throw new Error(`Listener "${options.listener}" not found`);

    const contract = await container.model
      .contractTable()
      .where('id', listener.contract)
      .where('network', options.network)
      .whereNotNull('abi')
      .first();
    if (!contract) throw new Error(`Contract "${listener.contract}" not found`);

    const contractProvider = container.blockchain.contract(
      contract.address,
      contract.abi,
      provider,
    );

    const [from, to] = options.interval.split('-');
    const events = await contractProvider.queryFilter(
      contractProvider.filters[listener.name](),
      Number(from),
      Number(to),
    );
    if (events.length === 0) return logger.info(`Events not found ${from}-${to} between`);

    await rabbit.publishTopic(
      `scanner.events.${options.network}`,
      {
        contract: {
          id: contract.id,
          network: contract.network,
          address: contract.address,
        },
        listener: {
          id: listener.id,
          name: listener.name,
        },
        from,
        to,
        events: events.map(normalizeEvent),
      },
      { priority: options.priority },
    );
    logger.info(`Push ${events.length} events to topic`);
    return process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
