import { testInfoAPI, testPerpetualsInfoAPI, testSpotInfoAPI } from './tests';
import { Hyperliquid } from 'hyperliquid-sdk';

async function main() {
  const walletPrivateKey = '';

  const sdk = new Hyperliquid(walletPrivateKey);
  await testInfoAPI(sdk);

  await testSpotInfoAPI(sdk);

  await testPerpetualsInfoAPI(sdk);

  process.exit(0);
}
main();
