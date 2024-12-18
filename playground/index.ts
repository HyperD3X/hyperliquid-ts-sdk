import { testInfoAPI } from './tests';
import { Hyperliquid } from '@hyperliquid-sdk/sdk';

async function main() {
  const sdk = new Hyperliquid('');
  await testInfoAPI(sdk);
  // await testSpotInfoAPI(sdk);

  // await testPerpetualsInfoAPI(sdk);
}
main();
