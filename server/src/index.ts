import 'module-alias/register';
import 'source-map-support/register';
import http from 'http';
import Express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { resolve } from 'path';
import container from '@container';
import { route } from '@api/router';

container.model
  .migrationService()
  .up()
  .then(async () => {
    const express = Express();
    const server = http.createServer(express);
    express.use(Express.static(resolve(__dirname, '../../public')));
    route(express);
    express.get(/\/.+/, (_, res) => res.sendFile(resolve(__dirname, '../../public/index.html')));
    const ws = new WebSocketServer({ server });
    server.listen(8080, () => console.log(`Listen 8080`));

    const rabbit = container.rabbitmq();
    rabbit.on('connected', async () => {
      await rabbit.createQueue(
        'scanner_events_ws',
        { durable: false, autoDelete: true },
        (msg, ack) => {
          const data = msg.content.toString();
          ws.clients.forEach((client) => client.readyState === WebSocket.OPEN && client.send(data));
          ack();
        },
      );
      rabbit.bindToTopic('scanner_events_ws', 'scanner.events.*');
    });
  });
