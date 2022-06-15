import 'source-map-support/register';
import 'module-alias/register';
import cli from 'command-line-args';
import container from '@container';

container.model
  .migrationService()
  .up()
  .then(async () => {
    const options = cli([{ name: 'period', alias: 'p', type: String }]);

    const queue = container.model.queueService();
    switch (options.period) {
      case 'minute30':
        console.log('add task');
        await queue.push('scheduleMinute30', {});
        break;
      default:
        throw new Error('Invalid period');
    }

    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
