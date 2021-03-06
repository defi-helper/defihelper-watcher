import container from '@container';
import { contractTableName, eventListenerTableName } from '@models/Contract/Entity';
import { historySyncTableName } from '@models/Interaction/Entity';
import { Process, TaskStatus } from '@models/Queue/Entity';

export default async function (process: Process) {
  const syncHistories = await container.model
    .historySyncTable()
    .column(`${historySyncTableName}.*`)
    .innerJoin(
      eventListenerTableName,
      `${eventListenerTableName}.id`,
      `${historySyncTableName}.eventListener`,
    )
    .innerJoin(contractTableName, `${contractTableName}.id`, `${eventListenerTableName}.contract`)
    .whereNotNull('abi')
    .where(`${contractTableName}.enabled`, true);

  const queue = container.model.queueService();
  const interaction = container.model.interactionService();
  await Promise.all(
    syncHistories.map(async (historySync) => {
      let task;
      if (historySync.task !== null) {
        task = await queue.table().where('id', historySync.task).first();
        if (task) {
          if ([TaskStatus.Pending, TaskStatus.Process].includes(task.status)) return null;
          return queue.resetAndRestart(task);
        }
      }
      task = await queue.push('interactionHistorySyncResolver', { id: historySync.id });
      return interaction.updateHistorySync({
        ...historySync,
        task: task.id,
      });
    }),
  );

  return process.done();
}
