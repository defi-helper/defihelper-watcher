import { Express } from 'express';
import contractRouter from './contractRouter';

export function route(express: Express) {
  express.use('/api/contract', contractRouter);
}
