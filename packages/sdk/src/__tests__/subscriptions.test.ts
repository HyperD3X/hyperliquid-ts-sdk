import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';
import { ethers } from 'ethers';

let sdk: Hyperliquid;
let publiKey: string = '';

// Add mocks
describe('Hyperliquid Subscriptions API tests', () => {
  beforeAll(async () => {
    const privateKey = process.env.PRIVATE_KEY!;
    publiKey = await new ethers.Wallet(privateKey).getAddress();

    sdk = new Hyperliquid(privateKey);
    await sdk.connect();
  });

  test('subscribed to spots stream', () => {
    return new Promise<void>((res) => {
      return sdk.subscriptions.subscribeToWebData2(publiKey, async (data) => {
        expect(
          data.spotAssetCtxs.find((item) => item.coin === 'HYPE-SPOT'),
        ).toEqual({
          circulatingSupply: expect.any(Number),
          coin: expect.any(String),
          dayBaseVlm: expect.any(Number),
          dayNtlVlm: expect.any(Number),
          markPx: expect.any(Number),
          midPx: expect.any(Number),
          prevDayPx: expect.any(Number),
          totalSupply: expect.any(Number),
        });

        res();
      });
    });
  });

  test('subscribed to candle stream', () => {
    return new Promise<void>((res) => {
      return sdk.subscriptions.subscribeToCandle(
        'BTC-PERP',
        '15m',
        async (data) => {
          expect(data).toEqual({
            T: expect.any(Number),
            c: expect.any(String),
            h: expect.any(String),
            i: expect.any(String),
            l: expect.any(String),
            n: expect.any(Number),
            o: expect.any(String),
            s: expect.any(String),
            t: expect.any(Number),
            v: expect.any(String),
          });

          res();
        },
      );
    });
  });
});
