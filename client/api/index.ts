import axios from 'axios';

export interface CountResponse {
  count: number;
}

export interface Contract {
  id: string;
  address: string;
  network: number;
  name: string;
  abi: Array<{
    type: string;
    name: string;
    inputs: Array<{
      type: string;
      name: string;
    }>;
  }>;
  startHeight: number;
  updatedAt: string;
  createdAt: string;
}

export interface ContractListFilter {
  network?: number;
  address?: string;
  name?: string;
}

export function getContractList(
  filter: ContractListFilter = {},
  limit: number = 10,
  offset: number = 0,
) {
  return axios
    .get<Contract[]>(
      `/api/contract?limit=${limit}&offset=${offset}&network=${filter.network ?? ''}&name=${
        filter.name ?? ''
      }&address=${filter.address ?? ''}`,
    )
    .then(({ data }) => data);
}

export function getCountractCount(filter: ContractListFilter = {}) {
  return axios
    .get<CountResponse>(
      `/api/contract?network=${filter.network ?? ''}&name=${filter.name ?? ''}&address=${
        filter.address ?? ''
      }&count=yes`,
    )
    .then(({ data: { count } }) => count);
}

export function getContract(id: string) {
  return axios.get<Contract>(`/api/contract/${id}`).then(({ data }) => data);
}

export async function deleteContract(id: string) {
  return axios.delete(`/api/contract/${id}`);
}

export function createContract(
  name: string,
  network: number,
  address: string,
  startHeight: number,
  abi: string,
) {
  return axios
    .post<Contract>(`/api/contract`, {
      name,
      network,
      address,
      startHeight,
      abi,
      fid: '',
    })
    .then(({ data }) => data);
}

export async function updateContract(
  id: string,
  name: string,
  network: number,
  address: string,
  startHeight: number,
  abi: string,
) {
  return axios
    .put<Contract>(`/api/contract/${id}`, {
      name,
      network,
      address,
      startHeight,
      abi,
    })
    .then(({ data }) => data);
}

export interface EventListener {
  id: string;
  contract: string;
  name: string;
  sync: {
    currentBlock: number;
    syncHeight: number;
    progress: number;
  };
  syncHeight: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface EventListenerListFilter {
  name?: string;
}

export function getEventListenerList(
  contractId: string,
  filter: EventListenerListFilter = {},
  limit: number = 10,
  offset: number = 0,
) {
  return axios
    .get<EventListener[]>(
      `/api/contract/${contractId}/event-listener?limit=${limit}&offset=${offset}&name=${
        filter.name ?? ''
      }`,
    )
    .then(({ data }) => data);
}

export function getEventListenerCount(contractId: string, filter: EventListenerListFilter = {}) {
  return axios
    .get<CountResponse>(
      `/api/contract/${contractId}/event-listener?name=${filter.name ?? ''}&count=yes`,
    )
    .then(({ data: { count } }) => count);
}

export function getEventListener(contractId: string, id: string) {
  return axios
    .get<EventListener>(`/api/contract/${contractId}/event-listener/${id}`)
    .then(({ data }) => data);
}

export function deleteEventListener(contractId: string, id: string) {
  return axios.delete(`/api/contract/${contractId}/event-listener/${id}`);
}

export function createEventListener(contractId: string, name: string) {
  return axios
    .post<EventListener>(`/api/contract/${contractId}/event-listener`, {
      name,
    })
    .then(({ data }) => data);
}

export function updateEventListener(contractId: string, id: string, name: string) {
  return axios
    .put<EventListener>(`/api/contract/${contractId}/event-listener/${id}`, {
      name,
    })
    .then(({ data }) => data);
}
