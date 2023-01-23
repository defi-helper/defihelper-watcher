import { SchemaBuilder } from 'knex';
import { historySyncTableName } from '@models/Interaction/Entity';

export default (schema: SchemaBuilder) => {
  return schema.alterTable(historySyncTableName, (table) => {
    table.integer('endHeight').nullable().defaultTo(null);
    table.dropUnique(['eventListener']);
  });
};
