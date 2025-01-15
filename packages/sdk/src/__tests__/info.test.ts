import { beforeAll, describe } from '@jest/globals';
import { Hyperliquid } from '../index';
import { Wallet } from 'ethers';

let sdk: Hyperliquid;
let publicKey: string;

// Add mocks
describe('Hyperliquid INFO API tests', () => {
  beforeAll(async () => {
    const privateKey = process.env.PRIVATE_KEY!;
    const wallet = new Wallet(privateKey);
    publicKey = await wallet.getAddress();

    sdk = new Hyperliquid(wallet);
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

  test('Get user fees', async () => {
    const result = await sdk.info.getUserFees(publicKey);

    expect(result.activeReferralDiscount).toEqual(expect.any(String));
    expect(result.feeTrialReward).toEqual(expect.any(String));
    expect(result.userCrossRate).toEqual(expect.any(String));
    expect(result.userAddRate).toEqual(expect.any(String));
  });

  test('Get user portfolio', async () => {
    const result = await sdk.info.getUserPortfolio(publicKey);

    expect(result[0][0]).toEqual('day');

    if (typeof result[0][1] !== 'string') {
      expect(result[0][1].accountValueHistory[0][0]).toEqual(
        expect.any(Number),
      );
      expect(result[0][1].accountValueHistory[0][1]).toEqual(
        expect.any(String),
      );
    }
  });
});
