import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';
import { Wallet } from 'ethers';

let sdk: Hyperliquid;

// Add mocks
describe('Hyperliquid EXCHANGE API tests', () => {
  beforeAll(async () => {
    sdk = new Hyperliquid(Wallet.createRandom());
  });

  it.skip('Place Order', async () => {
    const t = async () => {
      await sdk.exchange.placeOrder({
        coin: 'PURR-PERP',
        is_buy: true,
        sz: 1,
        limit_px: 1,
        order_type: { limit: { tif: 'Gtc' } },
        reduce_only: false,
      });
    };

    return expect(t).rejects.toThrow(
      'Order must have minimum value of $10. asset=152',
    );
  });
});
