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
      contract,
      events: { length },
      from,
      to,
    } = JSON.parse(msg.content.toString());
    console.info(`${contract.network}:{${from}-${to}} ${length}`);
  })
  .then(() => rabbit.bindToTopic('scanner_events_log', 'scanner.events.*'));
