import { Container, singleton } from '@services/Container';
import { pgConnectFactory } from '@services/Database';
import { ConsoleLogger } from '@services/Log';
import { BlockchainContainer } from '@services/Blockchain';
import { ModelContainer } from '@models/container';
import { rabbitmqFactory } from '@services/Rabbitmq';
import { Cache } from '@services/Cache';
import config from './config';

class AppContainer extends Container<typeof config> {
  readonly database = singleton(pgConnectFactory(this.parent.database));

  readonly rabbitmq = singleton(rabbitmqFactory(this.parent.rabbitmq));

  readonly cache = singleton(Cache.factory(this.parent.cache, 'defihelper-scanner'));

  readonly blockchain = new BlockchainContainer(this.parent.blockchain);

  readonly logger = singleton(ConsoleLogger.factory());

  readonly model = new ModelContainer(this);
}

export default new AppContainer(config);
