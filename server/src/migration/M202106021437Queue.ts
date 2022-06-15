import { SchemaBuilder } from 'knex';
import { tableName, TaskStatus } from '@models/Queue/Entity';
import { QueueService } from '@models/Queue/Service';

export default (schema: SchemaBuilder) => {
  return schema.createTable(tableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('handler', 512).notNullable().index();
    table.jsonb('params').notNullable();
    table.dateTime('startAt').notNullable();
    table
      .enum('status', [TaskStatus.Pending, TaskStatus.Process, TaskStatus.Done, TaskStatus.Error], {
        useNative: true,
        enumName: `${tableName}_status_enum`,
      })
      .notNullable()
      .index();
    table.text('info').notNullable();
    table.text('error').notNullable();
    table.integer('timeout', 6).nullable();
    table.integer('retries', 3).defaultTo(0).notNullable();
    table.integer('priority').notNullable().defaultTo(QueueService.defaultPriority);
    table.string('topic', 64).notNullable().defaultTo(QueueService.defaultTopic);
    table.dateTime('updatedAt').notNullable();
    table.dateTime('createdAt').notNullable();
    table.primary(['id'], `${tableName}_pkey`);
  });
};
