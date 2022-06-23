import { Factory } from '@services/Container';
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { Contract, ContractTable, EventListener, EventListenerTable } from './Entity';

export class ContractService {
  constructor(
    readonly contractTable: Factory<ContractTable>,
    readonly listenerTable: Factory<EventListenerTable>,
  ) {}

  async createContract(
    network: number,
    address: string,
    name: string,
    abi: ethers.ContractInterface,
    startHeight: number,
  ) {
    const existing = await this.contractTable()
      .where({
        network,
        address: address.toLowerCase(),
      })
      .first();
    if (existing) return existing;

    const created: Contract = {
      id: uuid(),
      network,
      address: address.toLowerCase(),
      name,
      abi: JSON.stringify(abi, null, 4),
      startHeight,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.contractTable().insert(created);

    return created;
  }

  async updateContract(contract: Contract) {
    const updated = {
      ...contract,
      address: contract.address.toLowerCase(),
      abi: JSON.stringify(contract.abi, null, 4),
      updatedAt: new Date(),
    };
    await this.contractTable().where({ id: contract.id }).update(updated);

    return updated;
  }

  async deleteContract(contract: Contract) {
    await this.contractTable().where({ id: contract.id }).delete();
  }

  async createListener(contract: Contract, name: string) {
    const duplicate = await this.listenerTable()
      .where({
        name,
        contract: contract.id,
      })
      .first();
    if (duplicate) return duplicate;

    const created = {
      id: uuid(),
      contract: contract.id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.listenerTable().insert(created);

    return created;
  }

  async deleteListener(listener: EventListener) {
    await this.listenerTable().where({ id: listener.id }).delete();
  }
}
