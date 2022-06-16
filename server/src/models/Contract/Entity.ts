import { tableFactory as createTableFactory } from '@services/Database';
import { ethers } from 'ethers';

export interface Contract {
  id: string;
  fid: string | null;
  address: string;
  network: number;
  name: string;
  abi: ethers.ContractInterface;
  startHeight: number;
  updatedAt: Date;
  createdAt: Date;
}

export const contractTableName = 'contract';

export const contractTableFactory = createTableFactory<Contract>(contractTableName);

export type ContractTable = ReturnType<ReturnType<typeof contractTableFactory>>;

export interface EventListener {
  id: string;
  contract: string;
  name: string;
  updatedAt: Date;
  createdAt: Date;
}

export const eventListenerTableName = 'contract_event_listener';

export const eventListenerTableFactory = createTableFactory<EventListener>(eventListenerTableName);

export type EventListenerTable = ReturnType<ReturnType<typeof eventListenerTableFactory>>;
