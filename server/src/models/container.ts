import { resolve } from 'path';
import { Container, singleton } from '@services/Container';
import AppContainer from '@container';
import * as Models from '@models/index';

export class ModelContainer extends Container<typeof AppContainer> {
  readonly migrationTable = Models.Migration.Entity.tableFactory(this.parent.database);

  readonly migrationService = singleton(
    Models.Migration.Service.factory(
      this.parent.logger,
      this.parent.database,
      this.migrationTable,
      resolve(__dirname, '../migration'),
    ),
  );

  readonly queueTable = Models.Queue.Entity.tableFactory(this.parent.database);

  readonly queueService = singleton(
    () =>
      new Models.Queue.Service.QueueService(
        this.queueTable,
        this.parent.rabbitmq,
        this.parent.logger,
      ),
  );

  readonly walletInteractionTable = Models.WalletInteraction.Entity.walletInteractionTableFactory(
    this.parent.database,
  );

  readonly contractTable = Models.Contract.Entity.contractTableFactory(this.parent.database);

  readonly contractEventListenerTable = Models.Contract.Entity.eventListenerTableFactory(
    this.parent.database,
  );

  readonly contractService = singleton(
    () =>
      new Models.Contract.Service.ContractService(
        this.contractTable,
        this.contractEventListenerTable,
      ),
  );
}
