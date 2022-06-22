import { SchemaBuilder } from 'knex';
import { contractTableName } from '@models/Contract/Entity';

export default (schema: SchemaBuilder) => {
  return schema.alterTable(contractTableName, (table) => {
    table.boolean('enabled').notNullable().defaultTo(true).index();
  });
};
