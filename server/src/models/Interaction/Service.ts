import { Contract, EventListener } from '@models/Contract/Entity';
import { Factory } from '@services/Container';
import { v4 as uuid } from 'uuid';
import { HistorySync, HistorySyncTable, WalletInteraction, WalletInteractionTable } from './Entity';

export class InteractionService {
  constructor(
    readonly walletInteractionTable: Factory<WalletInteractionTable>,
    readonly historySyncTable: Factory<HistorySyncTable>,
  ) {}

  async createHistorySync({ id }: EventListener, syncHeight: number) {
    const created: HistorySync = {
      id: uuid(),
      eventListener: id,
      syncHeight,
      task: null,
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
}
