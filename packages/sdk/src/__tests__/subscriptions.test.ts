import { describe, beforeEach, afterEach } from '@jest/globals';
import { Hyperliquid, WebData2 } from '../index';
import { Wallet } from 'ethers';

let sdk: Hyperliquid;
let publicKey: string = '';

// Add mocks
describe('Hyperliquid Subscriptions API tests', () => {
  beforeEach(async () => {
    const wallet = Wallet.createRandom();
    publicKey = await wallet.getAddress();

    sdk = new Hyperliquid(wallet);
    await sdk.connect();
  });

  afterEach(async () => {
    sdk.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('subscribed to spots stream', () => {
    return new Promise<void>((res) => {
      return sdk.subscriptions.subscribeToWebData2(publicKey, async (data) => {
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

  it('subscribed to candle stream', () => {
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
            s: 'BTC-PERP',
            t: expect.any(Number),
            v: expect.any(String),
          });

          res();
        },
      );
    });
  });

  it('multiple subscribers to web2 data', async () => {
    jest.useRealTimers();

    let receivedDataThread_1: WebData2[] = [];
    await sdk.subscriptions.subscribeToWebData2(publicKey, (data) => {
      receivedDataThread_1.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(receivedDataThread_1.length).toBeGreaterThan(0);

    await sdk.subscriptions.unsubscribeFromWebData2(publicKey);

    receivedDataThread_1 = [];

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await sdk.subscriptions.subscribeToWebData2(publicKey, (data) => {
      receivedDataThread_1.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(receivedDataThread_1.length).toBeGreaterThan(0);
  });
});
