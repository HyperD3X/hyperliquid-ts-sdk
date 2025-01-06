import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';

let sdk: Hyperliquid;

// Add mocks
describe('Hyperliquid INFO API tests', () => {
  beforeAll(async () => {
    const privateKey = process.env.PRIVATE_KEY!;

    sdk = new Hyperliquid(privateKey);
  });

  test('Get All Mids', async () => {
    const result = await sdk.info.getAllMids();
    const key = Object.keys(result).filter((item) => item === 'BTC-PERP');

    expect(result[key[0]]).toEqual(expect.any(Number));
  });
});
