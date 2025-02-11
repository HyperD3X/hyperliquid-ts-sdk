import { AbstractSigner } from 'ethers';
import { RateLimiter } from '../utils/rateLimiter';
import { HttpApi } from '../utils/helpers';
import { InfoAPI } from './info';
import {
  signL1Action,
  orderToWire,
  orderWireToAction,
  signUserSignedAction,
  signUsdTransferAction,
  signWithdrawFromBridgeAction,
  signApproveBuilderFee,
} from '../utils/signing';
import * as CONSTANTS from '../types/constants';

import {
  CancelOrderRequest,
  CommonSuccessOrErrorResponse,
  LeverageModeEnum,
  Order,
  OrderRequest,
  OrderResponse,
  ApiResponseWithStatus,
} from '../types/index';

import {
  ExchangeType,
  ENDPOINTS,
  ARBITRUM_CHAIN_ID_HEX,
  HYPERLIQUID_CHAIN_NAME,
  LOG_PREFIX,
} from '../types/constants';
import { SymbolConversion } from '../utils/symbolConversion';

// const IS_MAINNET = true; // Make sure this matches the IS_MAINNET in signing.ts

export class ExchangeAPI {
  private wallet: AbstractSigner;
  private httpApi: HttpApi;
  private symbolConversion: SymbolConversion;
  private isMainnet = true;

  constructor(
    testnet: boolean,
    wallet: AbstractSigner,
    private info: InfoAPI,
    rateLimiter: RateLimiter,
    symbolConversion: SymbolConversion,
  ) {
    const baseURL = testnet
      ? CONSTANTS.BASE_URLS.TESTNET
      : CONSTANTS.BASE_URLS.PRODUCTION;
    this.isMainnet = !testnet;
    this.httpApi = new HttpApi(baseURL, ENDPOINTS.EXCHANGE, rateLimiter);
    this.wallet = wallet;
    this.symbolConversion = symbolConversion;
  }

  private async getAssetIndex(symbol: string): Promise<number> {
    const index = await this.symbolConversion.getAssetIndex(symbol);
    if (index === undefined) {
      throw new Error(`Unknown asset: ${symbol}`);
    }
    return index;
  }

  async placeOrder(
    orderRequest: OrderRequest,
  ): Promise<ApiResponseWithStatus<OrderResponse | string>> {
    const {
      orders,
      vaultAddress = null,
      grouping = 'na',
      builder,
    } = orderRequest;
    const ordersArray = orders ?? [orderRequest as Order];

    try {
      const assetIndexCache = new Map<string, number>();

      const orderWires = await Promise.all(
        ordersArray.map(async (o) => {
          let assetIndex = assetIndexCache.get(o.coin);
          if (assetIndex === undefined) {
            assetIndex = await this.getAssetIndex(o.coin);
            assetIndexCache.set(o.coin, assetIndex);
          }
          return orderToWire(o, assetIndex);
        }),
      );

      const actions = orderWireToAction(orderWires, grouping, builder);

      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        actions,
        vaultAddress,
        nonce,
        this.isMainnet,
      );

      const payload = { action: actions, nonce, signature, vaultAddress };

      const result = await this.httpApi.makeRequest<
        ApiResponseWithStatus<OrderResponse | string>
      >(payload, 1);

      return this.validateErrorResult(result);
    } catch (error) {
      throw error;
    }
  }

  /*
   * response examples:
   * ERROR:
   *  - {status: 'ok', response: {type: 'order', data: {statuses: [{error: 'Some error'}]}}}
   *  - {status: 'err', response: 'Some error'}
   * SUCCESS:
   *  - {status: 'ok', response: {type: 'default'}}
   */
  private validateErrorResult(
    result: ApiResponseWithStatus<
      OrderResponse | string | CommonSuccessOrErrorResponse
    >,
  ): ApiResponseWithStatus<
    OrderResponse | string | CommonSuccessOrErrorResponse
  > {
    if (typeof result.response !== 'string') {
      const status = result?.response?.data?.statuses?.find(
        (status) => !!status.error,
      );
      if (status) {
        throw new Error(status.error);
      }
    }

    if (typeof result.response === 'string' && result.status !== 'ok') {
      throw new Error(result.response);
    }

    return result;
  }

  //Cancel using order id (oid)
  async cancelOrder(
    cancelRequests: CancelOrderRequest | CancelOrderRequest[],
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse>> {
    try {
      const cancels = Array.isArray(cancelRequests)
        ? cancelRequests
        : [cancelRequests];

      // Ensure all cancel requests have asset indices
      const cancelsWithIndices = await Promise.all(
        cancels.map(async (req) => ({
          ...req,
          a: await this.getAssetIndex(req.coin),
        })),
      );

      const action = {
        type: ExchangeType.CANCEL,
        cancels: cancelsWithIndices.map(({ a, o }) => ({ a, o })),
      };

      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse>
      >(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Cancel using a CLOID
  async cancelOrderByCloid(symbol: string, cloid: string): Promise<any> {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: ExchangeType.CANCEL_BY_CLOID,
        cancels: [{ asset: assetIndex, cloid }],
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Modify a single order
  async modifyOrder(oid: number, orderRequest: Order): Promise<any> {
    try {
      const assetIndex = await this.getAssetIndex(orderRequest.coin);

      const orderWire = orderToWire(orderRequest, assetIndex);
      const action = {
        type: ExchangeType.MODIFY,
        oid,
        order: orderWire,
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Modify multiple orders at once
  async batchModifyOrders(
    modifies: Array<{ oid: number; order: Order }>,
  ): Promise<any> {
    try {
      // First, get all asset indices in parallel
      const assetIndices = await Promise.all(
        modifies.map((m) => this.getAssetIndex(m.order.coin)),
      );

      const action = {
        type: ExchangeType.BATCH_MODIFY,
        modifies: modifies.map((m, index) => {
          return {
            oid: m.oid,
            order: orderToWire(m.order, assetIndices[index]),
          };
        }),
      };

      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  async updateLeverage(
    symbol: string,
    leverageMode: LeverageModeEnum,
    leverage: number,
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse>> {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: ExchangeType.UPDATE_LEVERAGE,
        asset: assetIndex,
        isCross: leverageMode === LeverageModeEnum.CROSS,
        leverage: leverage,
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse>
      >(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Update how much margin there is on a perps position
  async updateIsolatedMargin(
    symbol: string,
    isBuy: boolean,
    ntli: number,
  ): Promise<any> {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: ExchangeType.UPDATE_ISOLATED_MARGIN,
        asset: assetIndex,
        isBuy,
        ntli,
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  private getChainIdHex(): string {
    return this.isMainnet
      ? ARBITRUM_CHAIN_ID_HEX.MAINNET
      : ARBITRUM_CHAIN_ID_HEX.TESTNET;
  }

  //Takes from the perps wallet and sends to another wallet without the $1 fee (doesn't touch bridge, so no fees)
  async usdTransfer(destination: string, amount: number): Promise<any> {
    try {
      const action = {
        type: ExchangeType.USD_SEND,
        hyperliquidChain: this.getHyperliquidChainName(),
        signatureChainId: this.getChainIdHex(),
        destination: destination,
        amount: amount.toString(),
        time: Date.now(),
      };
      const signature = await signUsdTransferAction(
        this.wallet,
        action,
        this.isMainnet,
      );

      const payload = { action, nonce: action.time, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Transfer SPOT assets i.e PURR to another wallet (doesn't touch bridge, so no fees)
  async spotTransfer(
    destination: string,
    token: string,
    amount: string,
  ): Promise<any> {
    try {
      const action = {
        type: ExchangeType.SPOT_SEND,
        hyperliquidChain: this.getHyperliquidChainName(),
        signatureChainId: this.getChainIdHex(),
        destination,
        token,
        amount,
        time: Date.now(),
      };
      const signature = await signUserSignedAction(
        this.wallet,
        action,
        [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'destination', type: 'string' },
          { name: 'token', type: 'string' },
          { name: 'amount', type: 'string' },
          { name: 'time', type: 'uint64' },
        ],
        'HyperliquidTransaction:SpotSend',
        this.isMainnet,
      );

      const payload = { action, nonce: action.time, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  private getHyperliquidChainName() {
    return this.isMainnet
      ? HYPERLIQUID_CHAIN_NAME.MAINNET
      : HYPERLIQUID_CHAIN_NAME.TESTNET;
  }

  //Withdraw USDC, this txn goes across the bridge and costs $1 in fees as of writing this
  async initiateWithdrawal(destination: string, amount: number): Promise<any> {
    try {
      const action = {
        type: ExchangeType.WITHDRAW,
        hyperliquidChain: this.getHyperliquidChainName(),
        signatureChainId: this.getChainIdHex(),
        destination: destination,
        amount: amount.toString(),
        time: Date.now(),
      };
      const signature = await signWithdrawFromBridgeAction(
        this.wallet,
        action,
        this.isMainnet,
      );

      const payload = { action, nonce: action.time, signature };
      const result = await this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse | string>
      >(payload, 1);

      return this.validateErrorResult(result);
    } catch (error) {
      throw error;
    }
  }

  //Transfer between spot and perpetual wallets (intra-account transfer)
  async transferBetweenSpotAndPerp(
    usdc: number,
    toPerp: boolean,
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse | string>> {
    try {
      const action = {
        type: ExchangeType.USD_CLASS_TRANSFER,
        hyperliquidChain: this.getHyperliquidChainName(),
        signatureChainId: this.getChainIdHex(),
        amount: usdc.toString(),
        toPerp: toPerp,
        nonce: Date.now(),
      };

      const signature = await signUserSignedAction(
        this.wallet,
        action,
        [
          { name: 'hyperliquidChain', type: 'string' },
          { name: 'amount', type: 'string' },
          { name: 'toPerp', type: 'bool' },
          { name: 'nonce', type: 'uint64' },
        ],
        'HyperliquidTransaction:UsdClassTransfer',
        this.isMainnet,
      );

      const payload = { action, nonce: action.nonce, signature };

      const result = await this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse | string>
      >(payload, 1);

      return this.validateErrorResult(result);
    } catch (error) {
      throw error;
    }
  }

  //Schedule a cancel for a given time (in ms) //Note: Only available once you've traded $1 000 000 in volume
  async scheduleCancel(time: number | null): Promise<any> {
    try {
      const action = { type: ExchangeType.SCHEDULE_CANCEL, time };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  //Transfer between vault and perpetual wallets (intra-account transfer)
  async vaultTransfer(
    vaultAddress: string,
    isDeposit: boolean,
    usd: number,
  ): Promise<any> {
    try {
      const action = {
        type: ExchangeType.VAULT_TRANSFER,
        vaultAddress,
        isDeposit,
        usd,
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }

  async setReferrer(code: string): Promise<any> {
    try {
      const action = {
        type: ExchangeType.SET_REFERRER,
        code,
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      const result = await this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse>
      >(payload, 1);

      return this.validateErrorResult(result);
    } catch (error) {
      throw error;
    }
  }

  /*
    builderPublicKey - EVM address for builder. Example:  "0x.."
    fee - fee in the percent format, max 1 percent. Example: "1%"
  */
  async approveBuilderFee(
    builderPublicKey: string,
    fee: string,
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse | string>> {
    try {
      const nonce = Date.now();

      const action = {
        type: ExchangeType.APPROVE_BUILDER_FEE,
        builder: builderPublicKey,
        maxFeeRate: fee,
        nonce,
      };

      const signature = await signApproveBuilderFee(
        this.wallet,
        action,
        this.isMainnet,
      );

      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest<
        ApiResponseWithStatus<CommonSuccessOrErrorResponse>
      >(payload, 1);
    } catch (error) {
      throw error;
    }
  }
}
