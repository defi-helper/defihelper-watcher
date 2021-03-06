import { v4 as uuid } from 'uuid';
import { Rabbit } from 'rabbit-queue';
import dayjs from 'dayjs';
import { Factory } from '@services/Container';
import { Log } from '@services/Log';
import { Task, TaskStatus, Table, Process } from './Entity';
import * as Handlers from '../../queue';

export type Handler = keyof typeof Handlers;

export interface HandleOptions {
  include?: Handler[];
  exclude?: Handler[];
}

export interface BrokerOptions {
  interval: number;
  handler: HandleOptions;
}

export interface ConsumerOptions {
  queue?: string;
}

export class QueueService {
  static readonly defaultPriority = 4; // min - 0, max - 9

  static readonly defaultTopic = 'default';

  constructor(readonly table: Factory<Table>, readonly rabbitmq: Rabbit, readonly logger: Log) {}

  async resetAndRestart(task: Task) {
    const updated = {
      ...task,
      status: TaskStatus.Pending,
      startAt: new Date(),
      error: '',
      updatedAt: new Date(),
    };
    await this.table().update(updated).where('id', updated.id);

    return updated;
  }

  async push<H extends Handler>(
    handler: H,
    params: Object,
    timeout: number | null = null,
    startAt: Date = new Date(),
    priority?: number,
    topic?: string,
  ) {
    const task: Task = {
      id: uuid(),
      handler,
      params,
      startAt,
      timeout,
      topic: topic ?? QueueService.defaultTopic,
      priority: priority ?? QueueService.defaultPriority,
      status: TaskStatus.Pending,
      info: '',
      error: '',
      retries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!dayjs(task.startAt).isAfter(new Date())) {
      await this.table().insert({
        ...task,
        status: TaskStatus.Process,
      });
      await this.rabbitmq
        .publishTopic(`scanner.tasks.${task.handler}.${task.topic}`, task, {
          priority: task.priority,
        })
        .catch(() =>
          this.table()
            .update({
              ...task,
              status: TaskStatus.Pending,
            })
            .where('id', task.id),
        );
      return task;
    }

    await this.table().insert(task);
    return task;
  }

  async handle(task: Task) {
    const process = new Process(task);
    try {
      const result = await Handlers[task.handler].default(process);
      if (result.addedInfo !== '') {
        this.logger.info(`queue:${task.handler}, ${task.id} ${result.addedInfo}`);
      }
      return await this.table().update(result.task).where('id', task.id);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`${e}`);

      return Promise.all([
        this.table().update(process.error(error).task).where('id', task.id),
        this.logger.error(`queue:${task.handler}, ${task.id} ${error.stack ?? error}`),
      ]);
    }
  }

  async getCandidates(limit: number) {
    return this.table()
      .where('status', TaskStatus.Pending)
      .andWhere('startAt', '<=', new Date())
      .orderBy('startAt', 'asc')
      .orderBy('priority', 'desc')
      .limit(limit);
  }

  async lock({ id }: Task) {
    const lock = await this.table().update({ status: TaskStatus.Process }).where({
      id,
      status: TaskStatus.Pending,
    });
    if (lock === 0) return false;

    return true;
  }

  async deferred(limit: number) {
    const candidates = await this.getCandidates(limit);

    await Promise.all(
      candidates.map(async (task) => {
        const isLocked = await this.lock(task);
        if (!isLocked) return;

        await this.rabbitmq.publishTopic(`scanner.tasks.${task.handler}.${task.topic}`, task, {
          priority: task.priority,
        });
      }),
    );
  }

  consume({ queue }: ConsumerOptions) {
    let isConsume = false;
    let isStoped = false;
    this.rabbitmq.createQueue(queue ?? 'tasks_default', { durable: false }, async (msg, ack) => {
      if (isStoped) return;
      isConsume = true;
      const task: Task = JSON.parse(msg.content.toString());
      console.info(`Handle task: ${task.id}`);
      await this.handle(task);
      ack();
      if (isStoped) setTimeout(() => this.rabbitmq.close(), 500); // for ack work
      isConsume = false;
    });

    return {
      stop: () => {
        isStoped = true;
        if (!isConsume) this.rabbitmq.close();
      },
    };
  }
}
