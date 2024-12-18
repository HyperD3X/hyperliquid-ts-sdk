export type AssetInfo = {
  name: string;
  szDecimals: number;
};

export type Meta = {
  universe: AssetInfo[];
};

// Any = Any
// Option = Optional
// cast = cast
// Callable = Callable
// NamedTuple = NamedTuple
// NotRequired = NotRequired

export type Side = 'A' | 'B';
export const SIDES: Side[] = ['A', 'B'];

export type SpotAssetInfo = {
  name: string;
  tokens: number[];
  index: number;
  isCanonical: boolean;
};

export type SpotTokenInfo = {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  isCanonical: boolean;
  evmContract?: string;
  fullName?: string;
};

export type SpotMeta = {
  universe: SpotAssetInfo[];
  tokens: SpotTokenInfo[];
};

export type SpotAssetCtx = {
  dayNtlVlm: string;
  markPx: string;
  midPx?: string;
  prevDayPx: string;
  circulatingSupply: string;
  coin: string;
};

export type SpotMetaAndAssetCtxs = [SpotMeta, SpotAssetCtx[]];

export type AllMidsSubscription = { type: 'allMids' };
export type L2BookSubscription = { type: 'l2Book'; coin: string };
export type TradesSubscription = { type: 'trades'; coin: string };
export type UserEventsSubscription = { type: 'userEvents'; user: string };
export type UserFillsSubscription = { type: 'userFills'; user: string };
export type CandleSubscription = {
  type: 'candle';
  coin: string;
  interval: string;
};
export type OrderUpdatesSubscription = { type: 'orderUpdates'; user: string };
export type UserFundingsSubscription = { type: 'userFundings'; user: string };
export type UserNonFundingLedgerUpdatesSubscription = {
  type: 'userNonFundingLedgerUpdates';
  user: string;
};
export type WebData2Subscription = { type: 'webData2'; user: string };

export type Subscription =
  | AllMidsSubscription
  | L2BookSubscription
  | TradesSubscription
  | UserEventsSubscription
  | UserFillsSubscription
  | CandleSubscription
  | OrderUpdatesSubscription
  | UserFundingsSubscription
  | UserNonFundingLedgerUpdatesSubscription
  | WebData2Subscription;

export type AllMidsData = {
  mids: { [key: string]: string };
};

export type AllMidsMsg = {
  channel: 'allMids';
  data: AllMidsData;
};

export type L2Level = {
  px: string;
  sz: string;
  n: number;
};

export type L2BookData = {
  coin: string;
  levels: [L2Level[]];
  time: number;
};

export type L2BookMsg = {
  channel: 'l2Book';
  data: L2BookData;
};

export type PongMsg = {
  channel: 'pong';
};

export type Trade = {
  coin: string;
  side: Side;
  px: string;
  sz: number;
  hash: string;
  time: number;
};

export type Signature = { r: string; s: string; v: number };

export type TradesMsg = {
  channel: 'trades';
  data: Trade[];
};

export type Fill = {
  coin: string;
  px: string;
  sz: string;
  side: Side;
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
  feeToken: string;
};

export type UserEventsData = {
  fills?: Fill[];
};

export type UserEventsMsg = {
  channel: 'user';
  data: UserEventsData;
};

export type UserFillsData = {
  user: string;
  isSnapshot: boolean;
  fills: Fill[];
};

export type UserFillsMsg = {
  channel: 'userFills';
  data: UserFillsData;
};

export type OtherWsMsg = {
  channel:
    | 'candle'
    | 'orderUpdates'
    | 'userFundings'
    | 'userNonFundingLedgerUpdates'
    | 'webData2';
  data?: any;
};

export type WsMsg =
  | AllMidsMsg
  | L2BookMsg
  | TradesMsg
  | UserEventsMsg
  | PongMsg
  | UserFillsMsg
  | OtherWsMsg;

export type BuilderInfo = {
  b: string;
  f: number;
};

export class Cloid {
  private rawCloid: string;

  constructor(rawCloid: string) {
    this.rawCloid = rawCloid;
    this.validate();
  }

  private validate(): void {
    if (!this.rawCloid.startsWith('0x')) {
      throw new Error('cloid is not a hex string');
    }
    if (this.rawCloid.slice(2).length !== 32) {
      throw new Error('cloid is not 16 bytes');
    }
  }

  static fromInt(cloid: number): Cloid {
    return new Cloid(`0x${cloid.toString(16).padStart(32, '0')}`);
  }

  static fromStr(cloid: string): Cloid {
    return new Cloid(cloid);
  }

  toRaw(): string {
    return this.rawCloid;
  }
}
