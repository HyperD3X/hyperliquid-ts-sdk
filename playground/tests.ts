import { Hyperliquid } from '@hyperliquid-sdk/sdk';

const raw_mode = true;
const user_address = '';

export async function testInfoAPI(sdk: Hyperliquid) {
  console.log('Testing InfoAPI methods:');

  console.log('getAllMids:');
  console.log(await sdk.info.getAllMids(raw_mode));

  // console.log('getUserOpenOrders:');
  // console.log(await sdk.info.getUserOpenOrders(user_address, raw_mode));
  //
  // console.log('getFrontendOpenOrders:');
  // console.log(await sdk.info.getFrontendOpenOrders(user_address, raw_mode));
  //
  // console.log('getUserFills:');
  // console.log(await sdk.info.getUserFills(user_address, raw_mode));
  //
  // console.log('getUserFillsByTime:');
  // console.log(
  //   await sdk.info.getUserFillsByTime(
  //     user_address,
  //     Date.now() - 1506400000,
  //     Date.now(),
  //     raw_mode,
  //   ),
  // ); // Last 24 hours
  //
  // console.log('getUserRateLimit:');
  // console.log(await sdk.info.getUserRateLimit(user_address, raw_mode));
  //
  // console.log('getOrderStatus:');
  // console.log(await sdk.info.getOrderStatus(user_address, 1000, raw_mode));
  //
  // console.log('getL2Book:');
  // const book = await sdk.info.getL2Book('BTC-PERP', raw_mode);
  // console.log(book);
  // console.log(book.levels);
  //
  // console.log('getCandleSnapshot:');
  // console.log(
  //   await sdk.info.getCandleSnapshot(
  //     'BTC-PERP',
  //     '1h',
  //     Date.now() - 86400000,
  //     Date.now(),
  //     raw_mode,
  //   ),
  // );
}

export async function testSpotInfoAPI(sdk: Hyperliquid) {
  console.log('\nTesting SpotInfoAPI methods:');

  console.log('getSpotMeta:');
  console.log(await sdk.info.spot.getSpotMeta(raw_mode));

  console.log('getSpotClearinghouseState:');
  console.log(
    await sdk.info.spot.getSpotClearinghouseState(user_address, raw_mode),
  );

  console.log('getSpotMetaAndAssetCtxs:');
  console.log(await sdk.info.spot.getSpotMetaAndAssetCtxs(raw_mode));
}

export async function testPerpetualsInfoAPI(sdk: Hyperliquid) {
  console.log('\nTesting PerpetualsInfoAPI methods:');

  console.log('getMeta:');
  console.log(await sdk.info.perpetuals.getMeta(raw_mode));

  console.log('getMetaAndAssetCtxs:');
  console.log(await sdk.info.perpetuals.getMetaAndAssetCtxs(raw_mode));

  console.log('getClearinghouseState:');
  const perpsClearing = await sdk.info.perpetuals.getClearinghouseState(
    user_address,
    raw_mode,
  );
  console.log(perpsClearing);
  console.log(perpsClearing.assetPositions);

  console.log('getUserFunding:');
  console.log(
    await sdk.info.perpetuals.getUserFunding(
      user_address,
      Date.now() - 86400000,
      Date.now(),
      raw_mode,
    ),
  );

  console.log('getUserNonFundingLedgerUpdates:');
  console.log(
    await sdk.info.perpetuals.getUserNonFundingLedgerUpdates(
      user_address,
      Date.now() - 86400000,
      Date.now(),
      raw_mode,
    ),
  );

  console.log('getFundingHistory:');
  console.log(
    await sdk.info.perpetuals.getFundingHistory(
      'BTC-PERP',
      Date.now() - 86400000,
      Date.now(),
      raw_mode,
    ),
  );
}
