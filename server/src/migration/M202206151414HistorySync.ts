import { SchemaBuilder } from 'knex';
import { eventListenerTableName } from '@models/Contract/Entity';
import { historySyncTableName } from '@models/Interaction/Entity';
import { tableName as queueTableName } from '@models/Queue/Entity';

export default (schema: SchemaBuilder) => {
  return schema.createTable(historySyncTableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('eventListener', 36).notNullable().index().unique();
    table.integer('syncHeight').notNullable().defaultTo(0);
    table.string('task', 36).nullable().index().unique();
    table.dateTime('createdAt').notNullable();
    table.dateTime('updatedAt').notNullable();
    table.primary(['id'], `${historySyncTableName}_pkey`);
    table
      .foreign('eventListener')
      .references(`${eventListenerTableName}.id`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign('task')
      .references(`${queueTableName}.id`)
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
};
