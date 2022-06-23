import { SchemaBuilder } from 'knex';
import { eventListenerTableName } from '@models/Contract/Entity';
import { promptlySyncTableName } from '@models/Interaction/Entity';

export default (schema: SchemaBuilder) => {
  return schema.createTable(promptlySyncTableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('eventListener', 36).notNullable().index().unique();
    table.dateTime('createdAt').notNullable();
    table.dateTime('updatedAt').notNullable();
    table.primary(['id'], `${promptlySyncTableName}_pkey`);
    table
      .foreign('eventListener')
      .references(`${eventListenerTableName}.id`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
};
