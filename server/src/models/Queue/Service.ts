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

  constructor(
    readonly table: Factory<Table>,
    readonly rabbitmq: Factory<Rabbit>,
    readonly log: Factory<Log>,
  ) {}

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
      await this.rabbitmq()
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
      const { task: result } = await Handlers[task.handler].default(process);
      return await this.table().update(result).where('id', task.id);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`${e}`);

      return Promise.all([
        this.table().update(process.error(error).task).where('id', task.id),
        this.log().info(`queue:${task.handler}, ${task.id} ${error.stack ?? error}`),
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

        await this.rabbitmq().publishTopic(`scanner.tasks.${task.handler}.${task.topic}`, task, {
          priority: task.priority,
        });
      }),
    );
  }

  async consumer(msg: any, ack: (error?: any, reply?: any) => any) {
    const task: Task = JSON.parse(msg.content.toString());
    this.log().info(`Handle task: ${task.id}`);
    console.warn(task);
    await this.handle(task);
    ack();
  }

  consume({ queue }: ConsumerOptions) {
    this.rabbitmq().createQueue(
      queue ?? 'scanner_tasks_default',
      { durable: false },
      this.consumer.bind(this),
    );
  }
}
