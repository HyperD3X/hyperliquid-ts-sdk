export type Tif = 'Alo' | 'Ioc' | 'Gtc';
export type TriggerType = 'tp' | 'sl';
export type LimitOrder = { tif: Tif };
export type TriggerOrder = {
  triggerPx: string | number;
  isMarket: boolean;
  tpsl: TriggerType;
};
export type Grouping = 'na' | 'normalTpsl' | 'positionTpsl';
export type OrderType = { limit?: LimitOrder; trigger?: TriggerOrder };
export type Cloid = string;
export type OidOrCloid = number | Cloid;

export interface Order extends BaseOrder {
  orders?: undefined;
  coin: string;
  is_buy: boolean;
  sz: number; // The size of the position in unit (not decimal). sz === 1 -> 1.00 if szDecimals is 2.
  limit_px: number;
  order_type: OrderType;
  reduce_only: boolean;
  cloid?: Cloid;
}

export type OrderRequest = Order | MultiOrder;

interface BaseOrder {
  vaultAddress?: string;
  grouping?: Grouping;
  builder?: Builder;
}

interface MultiOrder extends BaseOrder {
  orders: Order[];
}

export interface Builder {
  address: string;
  fee: number;
}

export interface AllMids {
  [coin: string]: number;
}

export type Universe = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
};

export type PerpMetaAndContext = Array<Meta | Array<AssetCtx>>;
export type SpotMetaAndContext = Array<SpotMeta | Array<SpotAssetCtx>>;

export type SpotMeta = {
  tokens: SpotToken[];
  universe: SpotMarket[];
};

export type Meta = {
  universe: Universe[];
};

export interface ClearinghouseState {
  assetPositions: {
    position: {
      coin: string;
      cumFunding: {
        allTime: string;
        sinceChange: string;
        sinceOpen: string;
      };
      entryPx: string;
      leverage: {
        rawUsd: string;
        type: string;
        value: number;
      };
      liquidationPx: string;
      marginUsed: string;
      maxLeverage: number;
      positionValue: string;
      returnOnEquity: string;
      szi: string;
      unrealizedPnl: string;
    };
    type: string;
  }[];
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  time: number;
  withdrawable: string;
}

// TODO: Check if this response can be changed to CommonSuccessOrErrorResponse as extension
export interface OrderResponse {
  type: string;
  data: {
    statuses: Array<{
      resting?: { oid: number };
      filled?: { oid: number };
      error?: string;
    }>;
  };
}

export interface CommonSuccessOrErrorResponse {
  type: string;
  data: {
    statuses: Array<{
      error?: string;
    }>;
  };
}

export interface ApiResponseWithStatus<T> {
  status: 'ok' | 'err';
  response: T;
}

export enum LeverageModeEnum {
  CROSS = 'cross',
  ISOLATED = 'isolated',
}

export interface Leverage {
  type: LeverageModeEnum;
  value: number;
  rawUsd?: string;
}

export interface WsTrade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  hash: string;
  time: number;
  tid: number;
}

export interface WsBook {
  coin: string;
  levels: [Array<WsLevel>, Array<WsLevel>];
  time: number;
}

export interface WsLevel {
  px: string;
  sz: string;
  n: number;
}

export interface WsOrder {
  order: {
    coin: string;
    side: string;
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
  };
  status: string;
  statusTimestamp: number;
  user: string;
}

export type WsUserEvent = (
  | WsFill[]
  | WsUserFunding
  | WsLiquidation
  | WsNonUserCancel[]
) & { user: string };

export interface WsFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
}

export interface WsUserFunding {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

export interface WsLiquidation {
  lid: number;
  liquidator: string;
  liquidated_user: string;
  liquidated_ntl_pos: string;
  liquidated_account_value: string;
}

export interface WsNonUserCancel {
  coin: string;
  oid: number;
}

export interface SpotBalance {
  coin: string;
  hold: number;
  total: number;
  token: number;
  entryNtl: number;
}

export interface ReferralStateResponse {
  builderRewards: string;
  claimedRewards: string;
  cumVlm: string;
  referredBy: {
    code: string;
    referrer: string;
  };
  referrerState: {
    data: {
      required: string;
    };
    stage: string;
  };
  rewardHistory: string[]; // TODO: check the type
  unclaimedRewards: string;
}

export type BuilderFeeResponse = number;

export interface SpotClearinghouseState {
  balances: SpotBalance[];
}

export type FrontendOpenOrders = FrontendOpenOrder[];

export type FrontendOpenOrder = {
  coin: string;
  isPositionTpsl: boolean;
  isTrigger: boolean;
  limitPx: string;
  oid: number;
  orderType: string;
  origSz: string;
  reduceOnly: boolean;
  side: string;
  sz: string;
  timestamp: number;
  triggerCondition: string;
  triggerPx: string;
};

export type UserFills = UserFill[];

export type UserFill = {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  hash: string;
  oid: number;
  px: string;
  side: string;
  startPosition: string;
  sz: string;
  time: number;
};

export type UserStatistic = {
  accountValueHistory: Array<Array<number | string>>;
  pnlHistory: Array<Array<number | string>>;
  vlm: string;
};

export type UserPortfolio = Array<Array<string | UserStatistic>>;

export type TokenDetails = {
  name: string;
  maxSupply: string;
  totalSupply: string;
  circulatingSupply: string;
  szDecimals: 0;
  weiDecimals: 5;
  midPx: string;
  markPx: string;
  prevDayPx: string;
  genesis: {
    userBalances: Array<Array<string>>;
  };
  deployer: string;
  deployGas: string;
  deployTime: string;
  seededUsdc: string;
  futureEmissions: string;
};

export type UserFees = {
  activeReferralDiscount: string;
  dailyUserVlm: [
    {
      date: string;
      exchange: string;
      userAdd: string;
      userCross: string;
    },
  ];
  feeSchedule: {
    add: string;
    cross: string;
    referralDiscount: string;
    tiers: {
      mm: [
        {
          add: string;
          makerFractionCutoff: string;
        },
      ];
      vip: [
        {
          add: string;
          cross: string;
          ntlCutoff: string;
        },
      ];
    };
  };
  userAddRate: string;
  userCrossRate: string;
  feeTrialReward: string;
  nextTrialAvailableTimestamp: number | null;
};

export interface UserRateLimit {
  [key: string]: any;
}

export interface OrderStatus {
  [key: string]: any;
}

export interface L2Book {
  levels: [
    {
      px: string;
      sz: string;
      n: number;
    }[],
    {
      px: string;
      sz: string;
      n: number;
    }[],
  ];
}

export interface CandleSnapshot {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

// Perps assets context
export interface AssetCtx {
  dayBaseVlm: string; // TODO: Check data type, it's number
  dayNtlVlm: string; // TODO: Check data type, it's number
  funding: string; // TODO: Check data type, it's number
  impactPxs: [string, string];
  markPx: string; // TODO: Check data type, it's number
  midPx: string; // TODO: Check data type, it's number
  openInterest: string; // TODO: Check data type, it's number
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

// Perpetuals
export interface MetaAndAssetCtxs {
  meta: Meta;
  assetCtxs: AssetCtx[];
}

export interface UserFundingDelta {
  coin: string;
  fundingRate: string;
  szi: string;
  type: 'funding';
  usdc: string;
}

export interface UserFundingEntry {
  delta: UserFundingDelta;
  hash: string;
  time: number;
}

export type UserFunding = UserFundingEntry[];

export interface UserNonFundingLedgerDelta {
  coin: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'liquidation';
  usdc: string;
}

export interface UserNonFundingLedgerEntry {
  delta: UserNonFundingLedgerDelta;
  hash: string;
  time: number;
}

export type UserNonFundingLedgerUpdates = UserNonFundingLedgerEntry[];

export interface FundingHistoryEntry {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export type FundingHistory = FundingHistoryEntry[];

export interface SpotToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical: boolean;
}

export interface SpotMarket {
  name: string;
  tokens: [number, number]; // Indices of base and quote tokens
  index: number;
  isCanonical: boolean;
}

export type SpotAssetCtx = {
  dayNtlVlm: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
};

export interface SpotAssetCtxExtended extends SpotAssetCtx {
  circulatingSupply: string;
  coin: string;
  dayBaseVlm: string; // TODO: Check data type, it's number
  totalSupply: string;
}

export interface SpotMetaAndAssetCtxs {
  meta: SpotMeta;
  assetCtxs: SpotAssetCtx[];
}

export interface UserOpenOrder {
  coin: string;
  limitPx: string;
  oid: number;
  side: string;
  sz: string;
  timestamp: number;
}

export type UserOpenOrders = UserOpenOrder[];

export interface OrderWire {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t: OrderType;
  c?: string;
}

export interface CancelOrderRequest {
  coin: string;
  o: number;
}

export type CancelOrderRequests = {
  a: number;
  o: number;
}[];

export interface CancelByCloidRequest {
  coin: string;
  cloid: Cloid;
}

export interface ModifyRequest {
  oid: OidOrCloid;
  order: OrderRequest;
}

export interface ModifyWire {
  oid: number;
  order: OrderWire;
}

export interface ScheduleCancelAction {
  type: 'scheduleCancel';
  time?: number | null;
}

export interface Signature {
  r: string;
  s: string;
  v: number;
}

export interface Notification {
  notification: string;
  user: string;
}

// As flexible as possible
export interface WebData2 extends MetaAndAssetCtxs {
  spotAssetCtxs: SpotAssetCtxExtended[];
  clearinghouseState: ClearinghouseState;
  spotState?: SpotClearinghouseState;
  serverTime: number;
  totalVaultEquity: string;
  user: string;
  agentAddress: string;
  agentValidUntil: number;
  cumLedger: string;
  isVault: boolean;
  openOrders: FrontendOpenOrders;
}

export interface WsUserFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
}

export type WsUserFills = {
  isSnapshot: boolean;
  fills: WsUserFill[];
  user: string;
};

export interface WsUserFunding {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

export type WsUserFundings = {
  isSnapshot: boolean;
  fundings: WsUserFunding[];
  user: string;
};

export interface WsUserNonFundingLedgerUpdate {
  time: number;
  coin: string;
  usdc: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'liquidation';
}

export type WsUserNonFundingLedgerUpdates = {
  isSnapshot: boolean;
  updates: WsUserNonFundingLedgerUpdate[];
  user: string;
};

export type WsUserActiveAssetData = {
  isSnapshot: boolean;
  user: string;
  coin: string;
  leverage: Leverage;
  maxTradeSzs: [string, string];
  availableToTrade: [string, string];
};
