import container from '@container';
import { Factory } from '@services/Container';
import { Emitter } from '@services/Event';
import { ethers } from 'ethers';
import { v4 as uuid } from 'uuid';
import { Contract, ContractTable, EventListener, EventListenerTable } from './Entity';

export class ContractService {
  public readonly onEventListenerCreated = new Emitter<EventListener>((eventListener) => {
    container.model.queueService().push('eventsEventListenerCreated', { id: eventListener.id });
  });

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
    const existing = await this.listenerTable()
      .where({
        name,
        contract: contract.id,
      })
      .first();
    if (existing) return existing;

    const created = {
      id: uuid(),
      contract: contract.id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.listenerTable().insert(created);
    this.onEventListenerCreated.emit(created);

    return created;
  }

  async updateListener(listener: EventListener) {
    const updated = {
      ...listener,
      updatedAt: new Date(),
    };
    await this.listenerTable()
      .where({
        id: listener.id,
      })
      .update(updated);

    return updated;
  }

  async deleteListener(listener: EventListener) {
    await this.listenerTable().where({ id: listener.id }).delete();
  }
}
