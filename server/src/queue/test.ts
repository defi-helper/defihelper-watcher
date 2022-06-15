import { Process } from '@models/Queue/Entity';

export default function (process: Process) {
  return process.done();
}
