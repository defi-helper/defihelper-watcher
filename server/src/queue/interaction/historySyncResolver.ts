import dayjs from 'dayjs';
import container from '@container';
import { Process } from '@models/Queue/Entity';
import { WalletInteraction } from '@models/Interaction/Entity';

function getBlocksInterval(current: number, to: number, step: number) {
  if (current < to) {
    const sync = Math.min(current + step, to);
    return {
      from: current,
      sync,
      to: sync,
    };
  }
  if (current > to) {
    const sync = Math.max(current - step, to);
    return {
      from: sync,
      sync,
      to: current,
    };
  }
  return {
    from: current,
    to: current,
    sync: current,
  };
}

interface Params {
  id: string;
}

export default async function (process: Process) {
  const { id } = process.task.params as Params;

  const historySync = await container.model.historySyncTable().where('id', id).first();
  if (!historySync) {
    throw new Error(`History "${id}" not found`);
  }
  const listener = await container.model
    .contractEventListenerTable()
    .where('id', historySync.eventListener)
    .first();
  if (!listener) {
    throw new Error(`Event listener "${historySync.eventListener}" not found`);
  }
  const contract = await container.model.contractTable().where('id', listener.contract).first();
  if (!contract) {
    throw new Error(`Contract "${listener.contract}" not found`);
  }
  if (!contract.enabled) {
    throw new Error(`Contract "${contract.id}" disabled`);
  }

  const network = container.blockchain.byNetwork(contract.network);
  const provider = network.provider();
  const contractProvider = container.blockchain.contract(contract.address, contract.abi, provider);
  const eventFilter = contractProvider.filters[listener.name];
  if (!eventFilter) {
    throw new Error(`Event "${listener.name}" not found in contract interface "${contract.id}"`);
  }

  const currentBlockNumber = await provider.getBlockNumber();
  const interval = getBlocksInterval(
    Math.min(historySync.syncHeight, currentBlockNumber),
    Math.min(historySync.endHeight ?? currentBlockNumber, currentBlockNumber),
    network.historySyncStep,
  );
  if (interval.from === interval.to) {
    return historySync.endHeight === null
      ? process.later(dayjs().add(1, 'minutes').toDate())
      : process.done();
  }

  const interactionService = container.model.interactionService();
  const events = await contractProvider.queryFilter(eventFilter(), interval.from, interval.to);
  await events.reduce<Promise<WalletInteraction | null>>(async (prev, event) => {
    await prev;

    if (historySync.saveEvents) {
      await interactionService.createEvent(event);
    }
    const receipt = await event.getTransactionReceipt();
    return receipt && interactionService.createWalletInteraction(contract, listener, receipt.from);
  }, Promise.resolve(null));

  await interactionService.updateHistorySync({
    ...historySync,
    syncHeight: interval.sync,
  });

  return process.done();
}
