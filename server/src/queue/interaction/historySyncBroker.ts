import container from '@container';
import { contractTableName, eventListenerTableName } from '@models/Contract/Entity';
import { HistorySync, historySyncTableName } from '@models/Interaction/Entity';
import { Process, TaskStatus } from '@models/Queue/Entity';

export default async function (process: Process) {
  const syncHistories = await container.model
    .historySyncTable()
    .column<Array<HistorySync>>(`${historySyncTableName}.*`)
    .innerJoin(
      eventListenerTableName,
      `${eventListenerTableName}.id`,
      `${historySyncTableName}.eventListener`,
    )
    .innerJoin(contractTableName, `${contractTableName}.id`, `${eventListenerTableName}.contract`)
    .whereNotNull('abi')
    .where(`${contractTableName}.enabled`, true)
    .where(function () {
      this.whereNull(`${historySyncTableName}.endHeight`);
      this.orWhereRaw('?? <> ??', [
        `${historySyncTableName}.syncHeight`,
        `${historySyncTableName}.endHeight`,
      ]);
    });

  const queue = container.model.queueService();
  const interaction = container.model.interactionService();
  syncHistories.reduce<Promise<unknown>>(async (prev, historySync) => {
    await prev;

    if (historySync.task !== null) {
      const task = await queue.table().where('id', historySync.task).first();
      if (task) {
        return [TaskStatus.Done, TaskStatus.Error].includes(task.status)
          ? queue.resetAndRestart(task)
          : null;
      }
    }

    return interaction.updateHistorySync({
      ...historySync,
      task: await queue
        .push('interactionHistorySyncResolver', { id: historySync.id })
        .then(({ id }) => id),
    });
  }, Promise.resolve(null));

  return process.done();
}
