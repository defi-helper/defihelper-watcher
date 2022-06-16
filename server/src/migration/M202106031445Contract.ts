import { SchemaBuilder } from 'knex';
import { contractTableName } from '@models/Contract/Entity';

export default (schema: SchemaBuilder) => {
  return schema.createTable(contractTableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('fid', 256).nullable().index().unique();
    table.string('address', 42).notNullable().index();
    table.integer('network').notNullable().index();
    table.string('name', 512).notNullable();
    table.jsonb('abi').notNullable();
    table.integer('startHeight').notNullable();
    table.dateTime('updatedAt').notNullable();
    table.dateTime('createdAt').notNullable();
    table.unique(['address', 'network']);
    table.primary(['id'], `${contractTableName}_pkey`);
  });
};
