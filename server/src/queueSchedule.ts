import 'source-map-support/register';
import 'module-alias/register';
import cli from 'command-line-args';
import container from '@container';

const options = cli([{ name: 'period', alias: 'p', type: String }]);

const queue = container.model.queueService();
switch (options.period) {
  case 'minute10':
    queue.push('scheduleMinute10', {});
    break;
  default:
    throw new Error('Invalid period');
}
