import { Config as BlockchainConfig } from '@services/Blockchain';
import dotenv from 'dotenv';

dotenv.config({ path: './configuration/.env' });

function int(value: string): number {
  return parseInt(value, 10);
}

function bool(value: string): boolean {
  return Boolean(value);
}

function array(value: string): string[] {
  return JSON.parse(value);
}

function url(value: string): URL {
  return new URL(value);
}

export default {
  sentryDsn: process.env.SENTRY_DSN ?? '',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: int(process.env.DATABASE_PORT ?? '5432'),
    user: process.env.DATABASE_USER ?? '',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? '',
    ssl: process.env.DATABASE_SSL ?? '',
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST ?? 'amqp://localhost:5672',
    options: {
      prefetch: int(process.env.RABBITMQ_PREFETCH ?? '1'),
      replyPattern: bool(process.env.RABBITMQ_REPLY ?? ''),
      scheduledPublish: bool(process.env.RABBITMQ_SCHEDULED_PUBLISH ?? ''),
    },
    queues: [
      {
        name: 'scanner_tasks_default',
        topic: 'scanner.tasks.*.default',
        durable: false,
      },
    ],
  },
  cache: {
    host: process.env.CACHE_HOST ?? '127.0.0.1',
    port: int(process.env.CACHE_PORT ?? '6379'),
    password: process.env.CACHE_PASSWORD ?? undefined,
    database: process.env.CACHE_DATABASE ?? undefined,
    tls: bool(process.env.CACHE_TLS ?? ''),
  },
  blockchain: {
    ethMainNode: array(process.env.ETH_NODE ?? '[]').map(url),
    goerliNode: array(process.env.GOERLI_NODE ?? '[]').map(url),
    optimisticNode: array(process.env.OPTIMISTIC_NODE ?? '[]').map(url),
    bscMainNode: array(process.env.BSC_NODE ?? '[]').map(url),
    polygonMainNode: array(process.env.POLYGON_NODE ?? '[]').map(url),
    moonriverMainNode: array(process.env.MOONRIVER_NODE ?? '[]').map(url),
    avalancheMainNode: array(process.env.AVALANCHE_NODE ?? '[]').map(url),
  } as BlockchainConfig,
};
