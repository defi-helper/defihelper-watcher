import container from '@container';
import { Process } from '@models/Queue/Entity';

interface Params {
  id: string;
}

export default async function (process: Process) {
  const { id } = process.task.params as Params;

  const listener = await container.model.contractEventListenerTable().where('id', id).first();
  if (!listener) throw new Error(`Listener "${id}" not found`);

  const contract = await container.model.contractTable().where('id', listener.contract).first();
  if (!contract) throw new Error(`Contract "${listener.contract}" not found`);

  await container.model.interactionService().createHistorySync(listener, contract.startHeight);

  return process.done();
}
