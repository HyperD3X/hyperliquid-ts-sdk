import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';
import { Wallet } from 'ethers';

let sdk: Hyperliquid;
let wallet: Wallet;

// Add mocks
describe('Hyperliquid EXCHANGE API tests', () => {
  beforeAll(async () => {
    wallet = new Wallet(process.env.PRIVATE_KEY!);
    sdk = new Hyperliquid(wallet);
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

  it.skip('Approve builder fee', async () => {
    const builder = '';
    const result = await sdk.exchange.approveBuilderFee(builder, '1%');

    expect(result).toEqual({ response: { type: 'default' }, status: 'ok' });

    const fee = await sdk.info.getMaximumBuilderFee(
      await wallet.getAddress(),
      builder,
    );

    expect(fee).toEqual(1000);
  });

  it.skip('Send market request with builder', async () => {
    const builder = '';
    const result = await sdk.custom.marketOpen(
      'BTC-PERP',
      true,
      190730,
      undefined,
      undefined,
      undefined,
      { address: builder, fee: 10 },
    );

    expect(result).toEqual({ response: { type: 'default' }, status: 'ok' });
  });
});
