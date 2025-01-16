import { testInfoAPI, testPerpetualsInfoAPI, testSpotInfoAPI } from './tests';
import { Hyperliquid } from '@hyper-d3x/hyperliquid-ts-sdk';

async function main() {
  const walletPrivateKey = '';

  const sdk = new Hyperliquid(walletPrivateKey);
  await sdk.connect();

  await testInfoAPI(sdk);

  await testSpotInfoAPI(sdk);

  await testPerpetualsInfoAPI(sdk);

  process.exit(0);
}
main();
