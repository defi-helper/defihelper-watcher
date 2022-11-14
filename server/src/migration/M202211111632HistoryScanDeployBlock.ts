import { SchemaBuilder } from 'knex';
import { historySyncTableName } from '@models/Interaction/Entity';

export default (schema: SchemaBuilder) => {
  return schema.alterTable(historySyncTableName, (table) => {
    table.integer('deployHeight').notNullable().defaultTo(0);
  });
};
