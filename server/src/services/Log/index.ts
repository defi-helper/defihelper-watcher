import { Factory } from '@services/Container';
import dayjs from 'dayjs';
import { Rabbit } from 'rabbit-queue';

export interface Log {
  debug(msg: string): any;

  info(msg: string): any;

  warn(msg: string): any;

  error(msg: string): any;
}

export class ConsoleLogger implements Log {
  static factory = () => () => new ConsoleLogger();

  // eslint-disable-next-line
  format(type: string, msg: string) {
    return `${type} [${dayjs().format('DD-MM-YYYY HH:mm:ss Z')}]: ${msg}`;
  }

  debug(msg: string) {
    console.debug(this.format('DEBUG', msg));
  }

  info(msg: string) {
    console.log(this.format('INFO', msg));
  }

  warn(msg: string) {
    console.warn(this.format('WARN', msg));
  }

  error(msg: string) {
    console.error(this.format('ERROR', msg));
  }
}

export class RabbitmqLogger implements Log {
  static factory = (rabbit: Factory<Rabbit>) => () => new RabbitmqLogger(rabbit());

  constructor(public readonly rabbit: Rabbit) {}

  // eslint-disable-next-line
  format(level: string, msg: string) {
    return {
      service: 'scanner',
      level,
      time: dayjs().format('DD-MM-YYYY HH:mm:ss Z'),
      message: msg,
    };
  }

  debug(msg: string) {
    this.rabbit.publishTopic('logger.scanner.debug', this.format('debug', msg));
  }

  info(msg: string) {
    this.rabbit.publishTopic('logger.scanner.info', this.format('info', msg));
  }

  warn(msg: string) {
    this.rabbit.publishTopic('logger.scanner.warn', this.format('warn', msg));
  }

  error(msg: string) {
    this.rabbit.publishTopic('logger.scanner.error', this.format('error', msg));
  }
}
