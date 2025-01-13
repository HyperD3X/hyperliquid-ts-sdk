import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';

let sdk: Hyperliquid;

// Add mocks
describe.skip('Hyperliquid INFO API tests', () => {
  beforeAll(async () => {
    const privateKey = process.env.PRIVATE_KEY!;

    sdk = new Hyperliquid(privateKey);
  });

  test('Get All Mids', async () => {
    const result = await sdk.info.getAllMids();
    const key = Object.keys(result).filter((item) => item === 'BTC-PERP');

    expect(result[key[0]]).toEqual(expect.any(Number));
  });

  test('Get candles snapshot', async () => {
    const result = await sdk.info.getCandleSnapshot(
      'BTC-PERP',
      '1h',
      Date.now() - 86400000,
      Date.now(),
    );

    expect(result[0]).toEqual({
      t: expect.any(Number),
      T: expect.any(Number),
      s: expect.any(String),
      i: expect.any(String),
      o: expect.any(String),
      c: expect.any(String),
      h: expect.any(String),
      l: expect.any(String),
      v: expect.any(String),
      n: expect.any(Number),
    });
  });
});
