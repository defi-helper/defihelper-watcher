import container from '@container';
import { Process } from '@models/Queue/Entity';
import { WalletInteraction } from '@models/Interaction/Entity';
import { Event } from 'ethers';

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
  const step = network.historySyncStep;
  const provider = network.provider();
  const contractProvider = container.blockchain.contract(contract.address, contract.abi, provider);
  const eventFilter = contractProvider.filters[listener.name];
  if (!eventFilter) {
    throw new Error(`Event "${listener.name}" not found in contract interface "${contract.id}"`);
  }

  if (contract.startHeight <= historySync.syncHeight) {
    return process.done();
  }

  const toHeight = historySync.syncHeight - step;
  const events: Event[] | Error = await contractProvider.queryFilter(
    eventFilter(),
    toHeight,
    historySync.syncHeight,
  );

  const interactionService = container.model.interactionService();
  await events.reduce<Promise<WalletInteraction | null>>(async (prev, event) => {
    await prev;

    if (historySync.saveEvents) {
      await interactionService.createEvent(event);
    }

    const receipt = await event.getTransactionReceipt();
    if (!receipt) return null;
    return interactionService.createWalletInteraction(contract, listener, receipt.from);
  }, Promise.resolve(null));

  await interactionService.updateHistorySync({
    ...historySync,
    syncHeight: toHeight,
  });

  return process.done();
}
