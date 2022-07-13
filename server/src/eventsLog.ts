import 'source-map-support/register';
import 'module-alias/register';
import container from '@container';

const rabbit = container.rabbitmq();
rabbit.on('disconnected', () => {
  throw new Error('Rabbit disconnected');
});

rabbit
  .createQueue('scanner_events_log', { durable: false, autoDelete: true }, (msg, ack) => {
    ack();
    const {
      network,
      events: { length },
      from,
      to,
    } = JSON.parse(msg.content.toString());
    console.info(`${network}:{${from}-${to}} ${length}`);
  })
  .then(() => rabbit.bindToTopic('scanner_events_log', 'scanner.events.*'));
