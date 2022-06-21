import container from '@container';
import { Express, Router } from 'express';
import bodyParser from 'body-parser';
import contractRouter from './contractRouter';
import reportRouter from './reportRouter';

export function route(express: Express) {
  express.use('/api/report', reportRouter);
  express.use('/api/contract', contractRouter);

  const addressRouter = Router();
  addressRouter.post('/bulk', bodyParser.json(), async (req, res) => {
    const addressList: string[] = req.body;

    if (!Array.isArray(addressList) || addressList.length > 100 || addressList.length === 0) {
      return res.status(400).send('Please put address[] to post body with >0 && <=100 elements');
    }

    const cases = await container.model.walletInteractionTable().whereIn(
      'wallet',
      addressList.map((v) => v.toLowerCase()),
    );

    return res.json(
      cases.reduce<{ [wallet: string]: { [network: string]: string[] } }>(
        (prev, curr) => ({
          ...prev,
          [curr.wallet]: {
            ...(prev[curr.wallet] ?? {}),
            [curr.network]: [
              ...(prev[curr.wallet] ? prev[curr.wallet][curr.network] ?? [] : []),
              curr.contract,
            ],
          },
        }),
        {},
      ),
    );
  });
  addressRouter.get('/:address', async (req, res) => {
    const interactions = await container.model.walletInteractionTable().where(function () {
      this.where('wallet', req.params.address.toLowerCase());
      if (typeof req.query.network === 'string' && req.query.network !== '') {
        this.where('network', req.query.network);
      }
    });

    return res.json(
      interactions.map(({ network, contract, eventName: event }) => ({ network, contract, event })),
    );
  });
  express.use('/api/address', addressRouter);
}
