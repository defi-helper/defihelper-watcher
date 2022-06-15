import { tableFactory as createTableFactory } from '@services/Database';

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
