import { Contract, EventListener } from '@models/Contract/Entity';
import { Factory } from '@services/Container';
import * as ethers from 'ethers';
import { v4 as uuid } from 'uuid';
import {
  Event,
  EventTable,
  HistorySync,
  HistorySyncTable,
  PromptlySync,
  PromptlySyncTable,
  WalletInteraction,
  WalletInteractionTable,
} from './Entity';

export class InteractionService {
  constructor(
    readonly walletInteractionTable: Factory<WalletInteractionTable>,
    readonly historySyncTable: Factory<HistorySyncTable>,
    readonly promptlySyncTable: Factory<PromptlySyncTable>,
    readonly eventTable: Factory<EventTable>,
  ) {}

  async createHistorySync(
    { id }: EventListener,
    syncHeight: number,
    endHeight: number | null,
    saveEvents: boolean,
  ) {
    const created: HistorySync = {
      id: uuid(),
      eventListener: id,
      syncHeight,
      endHeight,
      task: null,
      saveEvents,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.historySyncTable().insert(created);

    return created;
  }

  async updateHistorySync(historySync: HistorySync) {
    const updated: HistorySync = {
      ...historySync,
      updatedAt: new Date(),
    };
    await this.historySyncTable().where('id', updated.id).update(updated);

    return updated;
  }

  deleteHistoricalSync({ id }: HistorySync) {
    return this.historySyncTable().where('id', id).delete();
  }

  async createPromptlySync({ id }: EventListener) {
    const duplicate = await this.promptlySyncTable().where('eventListener', id).first();
    if (duplicate) return duplicate;

    const created: PromptlySync = {
      id: uuid(),
      eventListener: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.promptlySyncTable().insert(created);

    return created;
  }

  async deletePromptlySync({ id }: EventListener) {
    await this.promptlySyncTable().where('eventListener', id).delete();
  }

  async createWalletInteraction(
    { network, address }: Contract,
    { name }: EventListener,
    wallet: string,
  ) {
    const created: WalletInteraction = {
      id: uuid(),
      network: String(network),
      contract: address.toLowerCase(),
      eventName: name,
      wallet: wallet.toLowerCase(),
      createdAt: new Date(),
    };
    await this.walletInteractionTable()
      .insert(created)
      .onConflict(['network', 'contract', 'eventName', 'wallet'])
      .ignore();

    return created;
  }

  async createEvent({ blockNumber, transactionHash, event }: ethers.Event) {
    if (!event) throw new Error('Event name not found');

    const duplicate = await this.eventTable().where({ transactionHash, event }).first();
    if (duplicate) return duplicate;

    const created: Event = {
      id: uuid(),
      blockNumber,
      transactionHash,
      event,
      createdAt: new Date(),
    };
    await this.eventTable().insert(created);

    return created;
  }
}
