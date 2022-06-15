import { SchemaBuilder } from 'knex';
import { walletInteractionTableName } from '@models/Interaction/Entity';

export default (schema: SchemaBuilder) => {
  return schema.createTable(walletInteractionTableName, (table) => {
    table.string('id', 36).notNullable();
    table.string('wallet', 42).notNullable().index();
    table.string('contract', 42).notNullable().index();
    table.string('network', 10).notNullable().index();
    table.string('eventName', 64).notNullable().index();
    table.dateTime('createdAt').notNullable();
    table.unique(['wallet', 'contract', 'network', 'eventName']);
    table.primary(['id'], `${walletInteractionTableName}_pkey`);
  });
};
