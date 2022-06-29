import { eventTableName } from '@models/Interaction/Entity';
import { SchemaBuilder } from 'knex';

export default (schema: SchemaBuilder) => {
  return schema.createTable(eventTableName, (table) => {
    table.string('id', 36).notNullable();
    table.integer('blockNumber').notNullable().index();
    table.string('transactionHash', 256).notNullable().index();
    table.string('event', 64).notNullable().index();
    table.dateTime('createdAt').notNullable();
    table.primary(['id'], `${eventTableName}_pkey`);
  });
};
