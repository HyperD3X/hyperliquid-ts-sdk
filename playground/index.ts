import {testInfoAPI, testPerpetualsInfoAPI, testSpotInfoAPI} from './tests';
import { Hyperliquid } from 'hyperliquid-sdk';

async function main() {
  const sdk = new Hyperliquid('');
  await testInfoAPI(sdk);

  await testSpotInfoAPI(sdk);

  await testPerpetualsInfoAPI(sdk);

  process.exit(0);
}
main();
