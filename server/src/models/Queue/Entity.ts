import { tableFactory as createTableFactory } from '@services/Database';
import dayjs from 'dayjs';
import * as Handlers from '../../queue';

export function hasHandler(handler: string): handler is keyof typeof Handlers {
  return Object.prototype.hasOwnProperty.call(Handlers, handler);
}

export enum TaskStatus {
  Pending = 'pending',
  Process = 'process',
  Done = 'done',
  Error = 'error',
}

export class Process {
  constructor(readonly task: Task = task, readonly addedInfo: string = '') {}

  param(params: Object) {
    return new Process({
      ...this.task,
      params,
    });
  }

  info(msg: string) {
    return new Process(
      {
        ...this.task,
        info: `${msg}\n\n${this.task.info}`.slice(0, 5000),
      },
      msg,
    );
  }

  done() {
    return new Process({
      ...this.task,
      status: TaskStatus.Done,
      updatedAt: new Date(),
    });
  }

  later(startAt: dayjs.Dayjs | Date) {
    return new Process({
      ...this.task,
      status: TaskStatus.Pending,
      startAt: startAt instanceof Date ? startAt : startAt.toDate(),
      updatedAt: new Date(),
    });
  }

  laterAt(value: number, unit?: dayjs.OpUnitType | undefined) {
    return this.later(dayjs().add(value, unit));
  }

  error(e: unknown) {
    return new Process({
      ...this.task,
      status: TaskStatus.Error,
      error: e instanceof Error ? String(e.stack) : `${e}`,
      updatedAt: new Date(),
    });
  }
}

export interface Task {
  id: string;
  handler: keyof typeof Handlers;
  params: Object;
  startAt: Date;
  status: TaskStatus;
  info: string;
  error: string;
  priority: number;
  topic: string;
  timeout: number | null;
  retries: number;
  updatedAt: Date;
  createdAt: Date;
}

export const tableName = 'queue';

export const tableFactory = createTableFactory<Task>(tableName);

export type Table = ReturnType<ReturnType<typeof tableFactory>>;
