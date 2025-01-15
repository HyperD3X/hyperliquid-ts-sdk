export const BASE_URLS = {
  PRODUCTION: 'https://api.hyperliquid.xyz',
  TESTNET: 'https://api.hyperliquid-testnet.xyz',
};

export const WSS_URLS = {
  PRODUCTION: 'wss://api.hyperliquid.xyz/ws',
  TESTNET: 'wss://api.hyperliquid-testnet.xyz/ws',
};

export const ENDPOINTS = {
  INFO: '/info',
  EXCHANGE: '/exchange',
};

export enum InfoType {
  ALL_MIDS = 'allMids',
  META = 'meta',
  OPEN_ORDERS = 'openOrders',
  REFERRAL = 'referral',
  FRONTEND_OPEN_ORDERS = 'frontendOpenOrders',
  USER_FILLS = 'userFills',
  USER_FILLS_BY_TIME = 'userFillsByTime',
  USER_RATE_LIMIT = 'userRateLimit',
  ORDER_STATUS = 'orderStatus',
  L2_BOOK = 'l2Book',
  CANDLE_SNAPSHOT = 'candleSnapshot',
  PERPS_META_AND_ASSET_CTXS = 'metaAndAssetCtxs',
  PERPS_CLEARINGHOUSE_STATE = 'clearinghouseState',
  USER_FUNDING = 'userFunding',
  USER_NON_FUNDING_LEDGER_UPDATES = 'userNonFundingLedgerUpdates',
  FUNDING_HISTORY = 'fundingHistory',
  SPOT_META = 'spotMeta',
  SPOT_CLEARINGHOUSE_STATE = 'spotClearinghouseState',
  SPOT_META_AND_ASSET_CTXS = 'spotMetaAndAssetCtxs',
  USER_FEES = 'userFees',
}

export enum ExchangeType {
  ORDER = 'order',
  CANCEL = 'cancel',
  CANCEL_BY_CLOID = 'cancelByCloid',
  SCHEDULE_CANCEL = 'scheduleCancel',
  MODIFY = 'modify',
  BATCH_MODIFY = 'batchModify',
  UPDATE_LEVERAGE = 'updateLeverage',
  UPDATE_ISOLATED_MARGIN = 'updateIsolatedMargin',
  USD_SEND = 'usdSend',
  SPOT_SEND = 'spotSend',
  WITHDRAW = 'withdraw3',
  VAULT_TRANSFER = 'vaultTransfer',
  SET_REFERRER = 'setReferrer',
  USD_CLASS_TRANSFER = 'usdClassTransfer',
}

export const WEBSOCKET = {
  MAINNET_URL: 'wss://api.hyperliquid.xyz/ws',
  TESTNET_URL: 'wss://api.hyperliquid-testnet.xyz/ws',
};

export const ARBITRUM_CHAIN_ID_DECIMAL = {
  MAINNET: 42161,
  TESTNET: 421614,
};

export const ARBITRUM_CHAIN_ID_HEX = {
  MAINNET: '0xa4b1',
  TESTNET: '0x66eee',
};

export const HYPERLIQUID_CHAIN_NAME = {
  MAINNET: 'Mainnet',
  TESTNET: 'Testnet',
};
