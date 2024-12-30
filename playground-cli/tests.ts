import { Hyperliquid } from 'hyperliquid-sdk';

const user_address = '0x8998a54320cD3Ec83F1837F7E2A9640e282e6711';

export async function testInfoAPI(sdk: Hyperliquid) {
  console.log('Testing InfoAPI methods:');

  console.log('getAllMids:');
  console.log(await sdk.info.getAllMids());

  console.log('getUserOpenOrders:');
  console.log(await sdk.info.getUserOpenOrders(user_address));

  console.log('getFrontendOpenOrders:');
  console.log(await sdk.info.getFrontendOpenOrders(user_address));

  console.log('getUserFills:');
  console.log(await sdk.info.getUserFills(user_address));

  console.log('getUserFillsByTime:');
  console.log(
    await sdk.info.getUserFillsByTime(
      user_address,
      Date.now() - 1506400000,
      Date.now(),
    ),
  ); // Last 24 hours

  console.log('getUserRateLimit:');
  console.log(await sdk.info.getUserRateLimit(user_address));

  console.log('getOrderStatus:');
  console.log(await sdk.info.getOrderStatus(user_address, 1000));

  console.log('getL2Book:');
  const book = await sdk.info.getL2Book('BTC-PERP');
  console.log(book);
  console.log(book.levels);

  console.log('getCandleSnapshot:');
  console.log(
    await sdk.info.getCandleSnapshot(
      'BTC-PERP',
      '1h',
      Date.now() - 86400000,
      Date.now(),
    ),
  );
}

export async function testSpotInfoAPI(sdk: Hyperliquid) {
  console.log('\nTesting SpotInfoAPI methods:');

  console.log('getSpotMeta:');
  console.log(await sdk.info.spot.getSpotMeta());

  console.log('getSpotClearinghouseState:');
  console.log(await sdk.info.spot.getSpotClearinghouseState(user_address));

  console.log('getSpotMetaAndAssetCtxs:');
  console.log(await sdk.info.spot.getSpotMetaAndAssetCtxs());
}

export async function testPerpetualsInfoAPI(sdk: Hyperliquid) {
  console.log('\nTesting PerpetualsInfoAPI methods:');

  console.log('getMeta:');
  console.log(await sdk.info.perpetuals.getMeta());

  console.log('getMetaAndAssetCtxs:');
  console.log(await sdk.info.perpetuals.getMetaAndAssetCtxs());

  console.log('getClearinghouseState:');
  const perpsClearing =
    await sdk.info.perpetuals.getClearinghouseState(user_address);
  console.log(perpsClearing);
  console.log(perpsClearing.assetPositions);

  console.log('getUserFunding:');
  console.log(
    await sdk.info.perpetuals.getUserFunding(
      user_address,
      Date.now() - 86400000,
      Date.now(),
    ),
  );

  console.log('getUserNonFundingLedgerUpdates:');
  console.log(
    await sdk.info.perpetuals.getUserNonFundingLedgerUpdates(
      user_address,
      Date.now() - 86400000,
      Date.now(),
    ),
  );

  console.log('getFundingHistory:');
  console.log(
    await sdk.info.perpetuals.getFundingHistory(
      'BTC-PERP',
      Date.now() - 86400000,
      Date.now(),
    ),
  );
}
