import { SchemaBuilder } from 'knex';
import { contractTableName, eventListenerTableName } from '@models/Contract/Entity';

export default (schema: SchemaBuilder) => {
  return schema.createTable(eventListenerTableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('contract', 36).notNullable().index();
    table.string('name', 128).notNullable().index();
    table.dateTime('updatedAt').notNullable();
    table.dateTime('createdAt').notNullable();
    table.primary(['id'], `${eventListenerTableName}_pkey`);
    table.unique(['contract', 'name']);
    table
      .foreign('contract')
      .references(`${contractTableName}.id`)
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
};
