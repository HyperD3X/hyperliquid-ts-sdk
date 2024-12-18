import { Decimal } from 'decimal.js'; // Importing Decimal for precise decimal arithmetic
import { bytesToHex } from '@ethereumjs/util'; // Libraries for hash and conversion
import { BuilderInfo, Cloid, Signature } from './types'; // Libraries for hash and conversion
import { encode } from '@msgpack/msgpack';
import { ethers, getBytes, HDNodeWallet, keccak256, type Wallet } from 'ethers';

type Tif = 'Alo' | 'Ioc' | 'Gtc'; // Order time-in-force types
type Tpsl = 'tp' | 'sl'; // Take profit or stop loss types

export interface LimitOrderType {
  tif: Tif; // Time in force type
}

const phantomDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export interface TriggerOrderType {
  triggerPx: number; // Trigger price
  isMarket: boolean; // If it is a market order
  tpsl: Tpsl; // Take profit or stop loss type
}

export interface TriggerOrderTypeWire {
  triggerPx: string; // Trigger price as a string for serialization
  isMarket: boolean; // If it is a market order
  tpsl: Tpsl; // Take profit or stop loss type
}

export interface OrderType {
  limit?: LimitOrderType; // Optional limit order type
  trigger?: TriggerOrderType; // Optional trigger order type
}

export interface OrderTypeWire {
  limit?: LimitOrderType; // Optional limit order type
  trigger?: TriggerOrderTypeWire; // Optional trigger order type as wire format
}

export interface OrderRequest {
  coin: string; // Coin type
  is_buy: boolean; // If the order is a buy
  sz: number; // Size of the order
  limit_px: number; // Limit price for the order
  order_type: OrderType; // Type of the order
  reduce_only: boolean; // If it's a reduce-only order
  cloid?: Cloid; // Optional unique identifier for the order
}

export type OidOrCloid = number | string; // Order ID or Cloid type

export interface ModifyRequest {
  oid: OidOrCloid; // Order ID or Cloid
  order: OrderRequest; // The order to modify
}

export interface CancelRequest {
  coin: string; // Coin type
  oid: number; // Order ID to cancel
}

export interface CancelByCloidRequest {
  coin: string; // Coin type
  cloid: Cloid; // Cloid to cancel
}

export type Grouping = 'na' | 'normalTpsl' | 'positionTpsl'; // Grouping types for orders

export interface Order {
  asset: number; // Asset type number
  isBuy: boolean; // If order is a buy
  limitPx: number; // Limit price
  sz: number; // Size of the order
  reduceOnly: boolean; // If it's reduce-only
  cloid?: Cloid; // Optional Cloid
}

export interface OrderWire {
  a: number; // Asset
  b: boolean; // Is Buy
  p: string; // Limit Price as string
  s: string; // Size as string
  r: boolean; // Reduce only
  t: OrderTypeWire; // Order type in wire format
  c?: string | null; // Optional Cloid in wire format
}

export interface ModifyWire {
  oid: number; // Order ID
  order: OrderWire; // Order in wire format
}

export interface ScheduleCancelAction {
  type: 'scheduleCancel'; // Action type
  time?: number | null; // Optional time for scheduling
}

// Sign types for different actions
export const USD_SEND_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'destination', type: 'string' },
  { name: 'amount', type: 'string' },
  { name: 'time', type: 'uint64' },
];

export const SPOT_TRANSFER_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'destination', type: 'string' },
  { name: 'token', type: 'string' },
  { name: 'amount', type: 'string' },
  { name: 'time', type: 'uint64' },
];

export const WITHDRAW_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'destination', type: 'string' },
  { name: 'amount', type: 'string' },
  { name: 'time', type: 'uint64' },
];

export const USD_CLASS_TRANSFER_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'amount', type: 'string' },
  { name: 'toPerp', type: 'boolean' },
  { name: 'nonce', type: 'uint64' },
];

export const CONVERT_TO_MULTI_SIG_USER_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'signers', type: 'string' },
  { name: 'nonce', type: 'uint64' },
];

export const MULTI_SIG_ENVELOPE_SIGN_TYPES = [
  { name: 'hyperliquidChain', type: 'string' },
  { name: 'multiSigActionHash', type: 'bytes32' },
  { name: 'nonce', type: 'uint64' },
];

export const orderTypeToWire = (orderType: OrderType): OrderTypeWire => {
  if (orderType.limit) {
    return { limit: orderType.limit }; // Return limit order
  } else if (orderType.trigger) {
    return {
      trigger: {
        isMarket: orderType.trigger.isMarket,
        triggerPx: floatToWire(orderType.trigger.triggerPx),
        tpsl: orderType.trigger.tpsl,
      },
    }; // Return trigger order
  }
  throw new Error('Invalid order type');
};

export const addressToBytes = (address: string): Uint8Array => {
  return Uint8Array.from(
    Buffer.from(address.startsWith('0x') ? address.slice(2) : address, 'hex'),
  );
};

export const actionHash = (
  action: unknown,
  vaultAddress: string | null,
  nonce: number,
): string => {
  const msgPackBytes = encode(action);
  const additionalBytesLength = vaultAddress === null ? 9 : 29;
  const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
  data.set(msgPackBytes);
  const view = new DataView(data.buffer);
  view.setBigUint64(msgPackBytes.length, BigInt(nonce), false);
  if (vaultAddress === null) {
    view.setUint8(msgPackBytes.length + 8, 0);
  } else {
    view.setUint8(msgPackBytes.length + 8, 1);
    data.set(addressToBytes(vaultAddress), msgPackBytes.length + 9);
  }
  return keccak256(data);
};

export const constructPhantomAgent = (hash: string, isMainnet: boolean) => {
  return { source: isMainnet ? 'a' : 'b', connectionId: hash }; // Constructing agent object
};

export async function signL1Action(
  wallet: Wallet | HDNodeWallet,
  action: unknown,
  activePool: string | null,
  nonce: number,
  isMainnet: boolean,
): Promise<Signature> {
  const hash = actionHash(action, activePool, nonce);
  const phantomAgent = constructPhantomAgent(hash, isMainnet);
  const data = {
    domain: phantomDomain,
    types: agentTypes,
    primaryType: 'Agent',
    message: phantomAgent,
  };
  return signInner(wallet, data);
}

const agentTypes = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

export async function signUserSignedAction(
  wallet: Wallet,
  action: any,
  payloadTypes: Array<{ name: string; type: string }>,
  primaryType: string,
  isMainnet: boolean,
): Promise<Signature> {
  action.signatureChainId = '0x66eee';
  action.hyperliquidChain = isMainnet ? 'Mainnet' : 'Testnet';
  const data = {
    domain: {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: 421614,
      verifyingContract: '0x0000000000000000000000000000000000000000',
    },
    types: {
      [primaryType]: payloadTypes,
    },
    primaryType: primaryType,
    message: action,
  };
  return signInner(wallet, data);
}

export const addMultiSigTypes = (signTypes: any[]) => {
  const enrichedSignTypes = [];
  let enriched = false;
  for (const signType of signTypes) {
    enrichedSignTypes.push(signType); // Copy original sign type
    if (signType.name === 'hyperliquidChain') {
      enriched = true; // Found hyperliquidChain
      enrichedSignTypes.push({
        name: 'payloadMultiSigUser',
        type: 'address',
      }); // Adding multi-sig user field
      enrichedSignTypes.push({ name: 'outerSigner', type: 'address' }); // Adding outer signer field
    }
  }
  if (!enriched) {
    console.warn(
      '"hyperliquidChain" missing from sign_types. sign_types was not enriched with multi-sig signing types',
    );
  }
  return enrichedSignTypes; // Return enriched sign types
};

export const addMultiSigFields = (
  action: any,
  payloadMultiSigUser: string,
  outerSigner: string,
) => {
  action = { ...action }; // Clone action object
  action['payloadMultiSigUser'] = payloadMultiSigUser.toLowerCase(); // Adding multi-sig user
  action['outerSigner'] = outerSigner.toLowerCase(); // Adding outer signer
  return action; // Return modified action
};

export const signMultiSigInner = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
  signTypes: any[],
  txType: string,
  payloadMultiSigUser: string,
  outerSigner: string,
) => {
  const envelope = addMultiSigFields(action, payloadMultiSigUser, outerSigner); // Wrap action for multi-sig
  signTypes = addMultiSigTypes(signTypes); // Enrich sign types
  return await signUserSignedAction(
    wallet,
    envelope,
    signTypes,
    txType,
    isMainnet,
  ); // Signing the action
};

export const signMultiSigAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
  vaultAddress: string | null,
  nonce: number,
) => {
  const actionWithoutTag = { ...action }; // Clone action object
  delete actionWithoutTag.type; // Remove type tag
  const multiSigActionHash = actionHash(actionWithoutTag, vaultAddress, nonce); // Create action hash
  const envelope = {
    multiSigActionHash, // Adding the multi-sig action hash
    nonce, // Adding the nonce
  };
  return await signUserSignedAction(
    wallet,
    envelope,
    MULTI_SIG_ENVELOPE_SIGN_TYPES,
    'HyperliquidTransaction:SendMultiSig',
    isMainnet,
  ); // Signing multi-sig action
};

export const signUsdTransferAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    USD_SEND_SIGN_TYPES,
    'HyperliquidTransaction:UsdSend',
    isMainnet,
  ); // Signing USD transfer action
};

export const signSpotTransferAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    SPOT_TRANSFER_SIGN_TYPES,
    'HyperliquidTransaction:SpotSend',
    isMainnet,
  ); // Signing spot transfer action
};

export const signWithdrawFromBridgeAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    WITHDRAW_SIGN_TYPES,
    'HyperliquidTransaction:Withdraw',
    isMainnet,
  ); // Signing withdraw action
};

export const signUsdClassTransferAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    USD_CLASS_TRANSFER_SIGN_TYPES,
    'HyperliquidTransaction:UsdClassTransfer',
    isMainnet,
  ); // Signing USD class transfer
};

export const signConvertToMultiSigUserAction = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    CONVERT_TO_MULTI_SIG_USER_SIGN_TYPES,
    'HyperliquidTransaction:ConvertToMultiSigUser',
    isMainnet,
  ); // Signing convert to multi-signature user action
};

export const signAgent = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'agentAddress', type: 'address' },
      { name: 'agentName', type: 'string' },
      { name: 'nonce', type: 'uint64' },
    ],
    'HyperliquidTransaction:ApproveAgent',
    isMainnet,
  ); // Signing agent approval
};

export const signApproveBuilderFee = async (
  wallet: any,
  action: any,
  isMainnet: boolean,
) => {
  return await signUserSignedAction(
    wallet,
    action,
    [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'maxFeeRate', type: 'string' },
      { name: 'builder', type: 'address' },
      { name: 'nonce', type: 'uint64' },
    ],
    'HyperliquidTransaction:ApproveBuilderFee',
    isMainnet,
  ); // Signing builder fee approval
};

function splitSig(sig: string): Signature {
  const { r, s, v } = ethers.Signature.from(sig);
  return { r, s, v };
}

async function signInner(
  wallet: Wallet | HDNodeWallet,
  data: any,
): Promise<Signature> {
  const signature = await wallet.signTypedData(
    data.domain,
    data.types,
    data.message,
  );
  return splitSig(signature);
}

export const floatToWire = (x: number): string => {
  let rounded = x.toFixed(8); // Formatting float to 8 decimal places
  if (Math.abs(Number(rounded) - x) >= 1e-12) {
    throw new Error('floatToWire causes rounding: ' + x); // Check for rounding error
  }
  if (rounded === '-0') {
    rounded = '0'; // Normalizing negative zero
  }
  return new Decimal(rounded).toString(); // Normalize and return as string
};

export const floatToIntForHashing = (x: number): number => floatToInt(x, 8); // Float to integer with 8 decimal precision

export const floatToUsdInt = (x: number): number => floatToInt(x, 6); // Float to integer with 6 decimal precision

export const floatToInt = (x: number, power: number): number => {
  const withDecimals = x * Math.pow(10, power); // Scale float to integer
  if (Math.abs(Math.round(withDecimals) - withDecimals) >= 1e-3) {
    throw new Error('floatToInt causes rounding: ' + x); // Check for rounding error
  }
  return Math.round(withDecimals); // Return as integer
};

export const getTimestampMs = (): number => Math.floor(Date.now()); // Get current timestamp in milliseconds

export const orderRequestToOrderWire = (
  order: OrderRequest,
  asset: number,
): OrderWire => {
  const orderWire: OrderWire = {
    a: asset, // Assigning asset
    b: order.is_buy, // Assigning buy/sell flag
    p: floatToWire(order.limit_px), // Assigning limit price
    s: floatToWire(order.sz), // Assigning size
    r: order.reduce_only, // Assigning reduce only flag
    t: orderTypeToWire(order.order_type), // Assigning order type wire
  };
  if (order.cloid) {
    orderWire.c = order.cloid.toRaw(); // Assigning Cloid if present
  }
  return orderWire; // Return the transformed order
};

export const orderWiresToOrderAction = (
  orderWires: OrderWire[],
  builder?: BuilderInfo,
) => {
  const action: {
    type: string;
    orders: OrderWire[];
    grouping: string;
    builder?: BuilderInfo;
  } = {
    type: 'order', // Setting action type
    orders: orderWires, // Assigning orders
    grouping: 'na', // Default grouping
    builder: undefined,
  };
  if (builder) {
    action.builder = builder; // Adding builder to action if present
  }
  return action; // Return the constructed action
};
