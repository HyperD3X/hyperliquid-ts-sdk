import { Api } from './api';
import {
  Cloid,
  Meta,
  SpotMeta,
  SpotMetaAndAssetCtxs,
  Subscription,
} from './utils/types';
import { WebsocketManager } from './websocket-manager';

export class Info extends Api {
  private wsManager: WebsocketManager | null = null;
  public coinToAsset: { [key: string]: number } = {};
  public nameToCoin: { [key: string]: string } = {};

  constructor(
    baseUrl: string,
    skipWs: boolean = false,
    meta?: Meta,
    spotMeta?: SpotMeta,
  ) {
    super(baseUrl);

    this.init(baseUrl, skipWs, meta, spotMeta);
  }

  private async init(
    baseUrl: string,
    skipWs: boolean = false,
    meta?: Meta,
    spotMeta?: SpotMeta,
  ) {
    if (!skipWs) {
      // this.wsManager = new WebsocketManager(baseUrl);
      // this.wsManager.start();
    }
    if (meta === undefined) {
      meta = await this.meta();
    }

    if (spotMeta === undefined) {
      spotMeta = await this.spotMeta();
    }

    this.coinToAsset = Object.fromEntries(
      meta.universe.map((assetInfo, asset) => [assetInfo.name, asset]),
    );
    this.nameToCoin = Object.fromEntries(
      meta.universe.map((assetInfo) => [assetInfo.name, assetInfo.name]),
    );

    // spot assets start at 10000
    for (const spotInfo of spotMeta.universe) {
      this.coinToAsset[spotInfo.name] = spotInfo.index + 10000;
      this.nameToCoin[spotInfo.name] = spotInfo.name;
      const [base, quote] = spotInfo.tokens;
      const name = `${spotMeta.tokens[base].name}/${spotMeta.tokens[quote].name}`;
      if (!(name in this.nameToCoin)) {
        this.nameToCoin[name] = spotInfo.name;
      }
    }
  }

  userState(address: string): any {
    /** Retrieve trading details about a user.
     *
     * POST /info
     *
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     * Returns:
     *     {
     *         assetPositions: [
     *             {
     *                 position: {
     *                     coin: str,
     *                     entryPx: Optional[float string]
     *                     leverage: {
     *                         type: "cross" | "isolated",
     *                         value: int,
     *                         rawUsd: float string  // only if type is "isolated"
     *                     },
     *                     liquidationPx: Optional[float string]
     *                     marginUsed: float string,
     *                     positionValue: float string,
     *                     returnOnEquity: float string,
     *                     szi: float string,
     *                     unrealizedPnl: float string
     *                 },
     *                 type: "oneWay"
     *             }
     *         ],
     *         crossMarginSummary: MarginSummary,
     *         marginSummary: MarginSummary,
     *         withdrawable: float string,
     *     }
     *
     *     where MarginSummary is {
     *             accountValue: float string,
     *             totalMarginUsed: float string,
     *             totalNtlPos: float string,
     *             totalRawUsd: float string,
     *         }
     */
    return this.post('/info', { type: 'clearinghouseState', user: address });
  }

  spotUserState(address: string): any {
    return this.post('/info', {
      type: 'spotClearinghouseState',
      user: address,
    });
  }

  openOrders(address: string): any {
    /** Retrieve a user's open orders.
     *
     * POST /info
     *
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     * Returns: [
     *     {
     *         coin: str,
     *         limitPx: float string,
     *         oid: int,
     *         side: "A" | "B",
     *         sz: float string,
     *         timestamp: int
     *     }
     * ]
     */
    return this.post('/info', { type: 'openOrders', user: address });
  }

  frontendOpenOrders(address: string): any {
    /** Retrieve a user's open orders with additional frontend info.
     *
     * POST /info
     *
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     * Returns: [
     *     {
     *         children:
     *             [
     *                 dict of frontend orders
     *             ]
     *         coin: str,
     *         isPositionTpsl: bool,
     *         isTrigger: bool,
     *         limitPx: float string,
     *         oid: int,
     *         orderType: str,
     *         origSz: float string,
     *         reduceOnly: bool,
     *         side: "A" | "B",
     *         sz: float string,
     *         tif: str,
     *         timestamp: int,
     *         triggerCondition: str,
     *         triggerPx: float str
     *     }
     * ]
     */
    return this.post('/info', { type: 'frontendOpenOrders', user: address });
  }

  allMids(): any {
    /** Retrieve all mids for all actively traded coins.
     *
     * POST /info
     *
     * Returns:
     *     {
     *       ATOM: float string,
     *       BTC: float string,
     *       any other coins which are trading: float string
     *     }
     */
    return this.post('/info', { type: 'allMids' });
  }

  userFills(address: string): any {
    /** Retrieve a given user's fills.
     *
     * POST /info
     *
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     *
     * Returns:
     *     [
     *       {
     *         closedPnl: float string,
     *         coin: str,
     *         crossed: bool,
     *         dir: str,
     *         hash: str,
     *         oid: int,
     *         px: float string,
     *         side: str,
     *         startPosition: float string,
     *         sz: float string,
     *         time: int
     *       },
     *       ...
     *     ]
     */
    return this.post('/info', { type: 'userFills', user: address });
  }

  userFillsByTime(address: string, startTime: number, endTime?: number): any {
    /** Retrieve a given user's fills by time.
     *
     * POST /info
     *
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     *     startTime (int): Unix timestamp in milliseconds
     *     endTime (Optional[int]): Unix timestamp in milliseconds
     *
     * Returns:
     *     [
     *       {
     *         closedPnl: float string,
     *         coin: str,
     *         crossed: bool,
     *         dir: str,
     *         hash: str,
     *         oid: int,
     *         px: float string,
     *         side: str,
     *         startPosition: float string,
     *         sz: float string,
     *         time: int
     *       },
     *       ...
     *     ]
     */
    return this.post('/info', {
      type: 'userFillsByTime',
      user: address,
      startTime,
      endTime,
    });
  }

  meta(): Promise<Meta> {
    /** Retrieve exchange perp metadata
     *
     * POST /info
     *
     * Returns:
     *     {
     *         universe: [
     *             {
     *                 name: str,
     *                 szDecimals: int
     *             },
     *             ...
     *         ]
     *     }
     */
    return this.post('/info', { type: 'meta' }) as Promise<Meta>;
  }

  metaAndAssetCtxs(): any {
    /** Retrieve exchange MetaAndAssetCtxs
     *
     * POST /info
     *
     * Returns:
     *     [
     *         {
     *             universe: [
     *                 {
     *                     'name': str,
     *                     'szDecimals': int
     *                     'maxLeverage': int,
     *                     'onlyIsolated': bool,
     *                 },
     *                 ...
     *             ]
     *         },
     *     [
     *         {
     *             "dayNtlVlm": float string,
     *             "funding": float string,
     *             "impactPxs": Optional([float string, float string]),
     *             "markPx": Optional(float string),
     *             "midPx": Optional(float string),
     *             "openInterest": float string,
     *             "oraclePx": float string,
     *             "premium": Optional(float string),
     *             "prevDayPx": float string
     *         },
     *         ...
     *     ]
     */
    return this.post('/info', { type: 'metaAndAssetCtxs' });
  }

  spotMeta(): Promise<SpotMeta> {
    /** Retrieve exchange spot metadata
     *
     * POST /info
     *
     * Returns:
     *     {
     *         universe: [
     *             {
     *                 tokens: [int, int],
     *                 name: str,
     *                 index: int,
     *                 isCanonical: bool
     *             },
     *             ...
     *         ],
     *         tokens: [
     *             {
     *                 name: str,
     *                 szDecimals: int,
     *                 weiDecimals: int,
     *                 index: int,
     *                 tokenId: str,
     *                 isCanonical: bool
     *             },
     *             ...
     *         ]
     *     }
     */
    return this.post('/info', { type: 'spotMeta' }) as Promise<SpotMeta>;
  }

  spotMetaAndAssetCtxs(): Promise<SpotMetaAndAssetCtxs> {
    /** Retrieve exchange spot asset contexts
     * POST /info
     * Returns:
     *     [
     *         {
     *             universe: [
     *                 {
     *                     tokens: [int, int],
     *                     name: str,
     *                     index: int,
     *                     isCanonical: bool
     *                 },
     *                 ...
     *             ],
     *             tokens: [
     *                 {
     *                     name: str,
     *                     szDecimals: int,
     *                     weiDecimals: int,
     *                     index: int,
     *                     tokenId: str,
     *                     isCanonical: bool
     *                 },
     *                 ...
     *             ]
     *         },
     *         [
     *             {
     *                 dayNtlVlm: float string,
     *                 markPx: float string,
     *                 midPx: Optional(float string),
     *                 prevDayPx: float string,
     *                 circulatingSupply: float string,
     *                 coin: str
     *             }
     *             ...
     *         ]
     *     ]
     */
    return this.post('/info', {
      type: 'spotMetaAndAssetCtxs',
    }) as Promise<SpotMetaAndAssetCtxs>;
  }

  fundingHistory(name: string, startTime: number, endTime?: number): any {
    /** Retrieve funding history for a given coin
     *
     * POST /info
     *
     * Args:
     *     name (str): Coin to retrieve funding history for.
     *     startTime (int): Unix timestamp in milliseconds.
     *     endTime (int): Unix timestamp in milliseconds.
     *
     * Returns:
     *     [
     *         {
     *             coin: str,
     *             fundingRate: float string,
     *             premium: float string,
     *             time: int
     *         },
     *         ...
     *     ]
     */
    const coin = this.nameToCoin[name];
    if (endTime !== undefined) {
      return this.post('/info', {
        type: 'fundingHistory',
        coin,
        startTime,
        endTime,
      });
    }
    return this.post('/info', { type: 'fundingHistory', coin, startTime });
  }

  userFundingHistory(user: string, startTime: number, endTime?: number): any {
    /** Retrieve a user's funding history
     * POST /info
     * Args:
     *     user (str): Address of the user in 42-character hexadecimal format.
     *     startTime (int): Start time in milliseconds, inclusive.
     *     endTime (int, optional): End time in milliseconds, inclusive. Defaults to current time.
     * Returns:
     *     List[Dict]: A list of funding history records, where each record contains:
     *         - user (str): User address.
     *         - type (str): Type of the record, e.g., "userFunding".
     *         - startTime (int): Unix timestamp of the start time in milliseconds.
     *         - endTime (int): Unix timestamp of the end time in milliseconds.
     */
    if (endTime !== undefined) {
      return this.post('/info', {
        type: 'userFunding',
        user,
        startTime,
        endTime,
      });
    }
    return this.post('/info', { type: 'userFunding', user, startTime });
  }

  l2Snapshot(name: string): any {
    /** Retrieve L2 snapshot for a given coin
     *
     * POST /info
     *
     * Args:
     *     name (str): Coin to retrieve L2 snapshot for.
     *
     * Returns:
     *     {
     *         coin: str,
     *         levels: [
     *             [
     *                 {
     *                     n: int,
     *                     px: float string,
     *                     sz: float string
     *                 },
     *                 ...
     *             ],
     *             ...
     *         ],
     *         time: int
     *     }
     */
    return this.post('/info', { type: 'l2Book', coin: this.nameToCoin[name] });
  }

  candlesSnapshot(
    name: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): any {
    /** Retrieve candles snapshot for a given coin
     *
     * POST /info
     *
     * Args:
     *     name (str): Coin to retrieve candles snapshot for.
     *     interval (str): Candlestick interval.
     *     startTime (int): Unix timestamp in milliseconds.
     *     endTime (int): Unix timestamp in milliseconds.
     *
     * Returns:
     *     [
     *         {
     *             T: int,
     *             c: float string,
     *             h: float string,
     *             i: str,
     *             l: float string,
     *             n: int,
     *             o: float string,
     *             s: string,
     *             t: int,
     *             v: float string
     *         },
     *         ...
     *     ]
     */
    const req = { coin: this.nameToCoin[name], interval, startTime, endTime };
    return this.post('/info', { type: 'candleSnapshot', req });
  }

  userFees(address: string): any {
    /** Retrieve the volume of trading activity associated with a user.
     * POST /info
     * Args:
     *     address (str): Onchain address in 42-character hexadecimal format;
     *                     e.g. 0x0000000000000000000000000000000000000000.
     * Returns:
     *     {
     *         activeReferralDiscount: float string,
     *         dailyUserVlm: [
     *             {
     *                 date: str,
     *                 exchange: str,
     *                 userAdd: float string,
     *                 userCross: float string
     *             },
     *         ],
     *         feeSchedule: {
     *             add: float string,
     *             cross: float string,
     *             referralDiscount: float string,
     *             tiers: {
     *                 mm: [
     *                     {
     *                         add: float string,
     *                         makerFractionCutoff: float string
     *                     },
     *                 ],
     *                 vip: [
     *                     {
     *                         add: float string,
     *                         cross: float string,
     *                         ntlCutoff: float string
     *                     },
     *                 ]
     *             }
     *         },
     *         userAddRate: float string,
     *         userCrossRate: float string
     *     }
     */
    return this.post('/info', { type: 'userFees', user: address });
  }

  queryOrderByOid(user: string, oid: number): any {
    return this.post('/info', { type: 'orderStatus', user, oid });
  }

  queryOrderByCloid(user: string, cloid: Cloid): any {
    return this.post('/info', {
      type: 'orderStatus',
      user,
      oid: cloid.toRaw(),
    });
  }

  queryReferralState(user: string): any {
    return this.post('/info', { type: 'referral', user });
  }

  querySubAccounts(user: string): any {
    return this.post('/info', { type: 'subAccounts', user });
  }

  queryUserToMultiSigSigners(multiSigUser: string): any {
    return this.post('/info', {
      type: 'userToMultiSigSigners',
      user: multiSigUser,
    });
  }

  subscribe(
    subscription: Subscription,
    callback: (param: any) => void,
  ): number {
    if (
      subscription.type === 'l2Book' ||
      subscription.type === 'trades' ||
      subscription.type === 'candle'
    ) {
      subscription.coin = this.nameToCoin[subscription.coin];
    }
    if (this.wsManager === null) {
      throw new Error('Cannot call subscribe since skip_ws was used');
    } else {
      return this.wsManager.subscribe(subscription, callback);
    }
  }

  unsubscribe(subscription: Subscription, subscriptionId: number): boolean {
    if (
      subscription.type === 'l2Book' ||
      subscription.type === 'trades' ||
      subscription.type === 'candle'
    ) {
      subscription.coin = this.nameToCoin[subscription.coin];
    }
    if (this.wsManager === null) {
      throw new Error('Cannot call unsubscribe since skip_ws was used');
    } else {
      return this.wsManager.unsubscribe(subscription, subscriptionId);
    }
  }

  nameToAsset(name: string): number {
    return this.coinToAsset[this.nameToCoin[name]];
  }
}
