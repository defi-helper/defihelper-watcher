import axios from "axios";

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
  }> | null;
  startHeight: number;
  updatedAt: string;
  createdAt: string;
}

export interface ContractListFilter {
  network?: number;
  address?: string;
  name?: string;
}

export async function getContractList(
  filter: ContractListFilter = {},
  limit: number = 10,
  offset: number = 0
) {
  const response = await axios.get<Contract[]>(
    `/api/contract?limit=${limit}&offset=${offset}&network=${
      filter.network ?? ""
    }&name=${filter.name ?? ""}&address=${filter.address ?? ""}`
  );

  return response.data;
}

export async function getCountractCount(filter: ContractListFilter = {}) {
  const response = await axios.get<CountResponse>(
    `/api/contract?network=${filter.network ?? ""}&name=${
      filter.name ?? ""
    }&address=${filter.address ?? ""}&count=yes`
  );

  return response.data.count;
}

export async function getContract(id: string) {
  const response = await axios.get<Contract>(`/api/contract/${id}`);

  return response.data;
}

export async function deleteContract(id: string) {
  return axios.delete(`/api/contract/${id}`);
}

export async function createContract(
  name: string,
  network: number,
  address: string,
  startHeight: number,
  abi: string
) {
  const response = await axios.post<Contract>(`/api/contract`, {
    name,
    network,
    address,
    startHeight,
    abi,
    fid: "",
  });

  return response.data;
}

export async function updateContract(
  id: string,
  name: string,
  network: number,
  address: string,
  startHeight: number,
  abi: string
) {
  const response = await axios.put<Contract>(`/api/contract/${id}`, {
    name,
    network,
    address,
    startHeight,
    abi,
  });

  return response.data;
}

export interface EventListener {
  id: string;
  contract: string;
  name: string;
  syncHeight: number;
  updatedAt: string;
  createdAt: string;
}

export interface EventListenerListFilter {
  name?: string;
}

export async function getEventListenerList(
  contractId: string,
  filter: EventListenerListFilter = {},
  limit: number = 10,
  offset: number = 0
) {
  const response = await axios.get<EventListener[]>(
    `/api/contract/${contractId}/event-listener?limit=${limit}&offset=${offset}&name=${
      filter.name ?? ""
    }`
  );

  return response.data;
}

export async function getEventListenerCount(
  contractId: string,
  filter: EventListenerListFilter = {}
) {
  const response = await axios.get<CountResponse>(
    `/api/contract/${contractId}/event-listener?name=${
      filter.name ?? ""
    }&count=yes`
  );

  return response.data.count;
}

export async function getEventListener(contractId: string, id: string) {
  const response = await axios.get<EventListener>(
    `/api/contract/${contractId}/event-listener/${id}`
  );

  return response.data;
}

export async function deleteEventListener(contractId: string, id: string) {
  return axios.delete(`/api/contract/${contractId}/event-listener/${id}`);
}

export async function createEventListener(
  contractId: string,
  name: string,
  syncHeight: number
) {
  const response = await axios.post<EventListener>(
    `/api/contract/${contractId}/event-listener`,
    {
      name,
      syncHeight,
    }
  );

  return response.data;
}

export async function updateEventListener(
  contractId: string,
  id: string,
  name: string,
  syncHeight: number
) {
  const response = await axios.put<EventListener>(
    `/api/contract/${contractId}/event-listener/${id}`,
    {
      name,
      syncHeight,
    }
  );

  return response.data;
}
