import { tableFactory as createTableFactory } from '@services/Database';

export interface PromptlySync {
  id: string;
  eventListener: string;
  createdAt: Date;
  updatedAt: Date;
}

export const promptlySyncTableName = 'promptly_sync';

export const promptlySyncTableFactory = createTableFactory<PromptlySync>(promptlySyncTableName);

export type PromptlySyncTable = ReturnType<ReturnType<typeof promptlySyncTableFactory>>;

export interface HistorySync {
  id: string;
  eventListener: string;
  syncHeight: number;
  endHeight: number | null;
  task: string | null;
  saveEvents: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const historySyncTableName = 'history_sync';

export const historySyncTableFactory = createTableFactory<HistorySync>(historySyncTableName);

export type HistorySyncTable = ReturnType<ReturnType<typeof historySyncTableFactory>>;

export interface WalletInteraction {
  id: string;
  wallet: string;
  contract: string;
  network: string;
  eventName: string;
  createdAt: Date;
}

export const walletInteractionTableName = 'wallet_interaction';

export const walletInteractionTableFactory = createTableFactory<WalletInteraction>(
  walletInteractionTableName,
);

export type WalletInteractionTable = ReturnType<ReturnType<typeof walletInteractionTableFactory>>;

export interface Event {
  id: string;
  blockNumber: number;
  transactionHash: string;
  event: string;
  createdAt: Date;
}

export const eventTableName = 'event';

export const eventTableFactory = createTableFactory<Event>(eventTableName);

export type EventTable = ReturnType<ReturnType<typeof eventTableFactory>>;
