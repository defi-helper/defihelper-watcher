import 'source-map-support/register';
import 'module-alias/register';
import container from '@container';

container.model
  .migrationService()
  .up()
  .then(async () => {
    const rabbit = container.rabbitmq();
    rabbit.on('disconnected', () => {
      throw new Error('Rabbit disconnected');
    });

    await rabbit.createQueue(
      'scanner_events_log',
      { durable: false, exclusive: true },
      (msg, ack) => {
        ack();
        const {
          network,
          events: { length },
          from,
          to,
        } = JSON.parse(msg.content.toString());
        console.info(`${network}:{${from}-${to}} ${length}`);
      },
    );
    rabbit.bindToTopic('scanner_events_log', 'scanner.events.*');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
