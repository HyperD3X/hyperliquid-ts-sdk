// src/rest/custom.ts

import { AbstractSigner } from 'ethers';
import { InfoAPI } from './info';
import { ExchangeAPI } from './exchange';
import {
  ApiResponseWithStatus,
  Builder,
  CommonSuccessOrErrorResponse,
  UserOpenOrders,
} from '../types';
import {
  OrderResponse,
  CancelOrderRequest,
  OrderRequest,
  OrderType,
} from '../types/index';
import { SymbolConversion } from '../utils/symbolConversion';
import { LOG_PREFIX } from '../types/constants';

export class CustomOperations {
  private exchange: ExchangeAPI;
  private infoApi: InfoAPI;
  private wallet: AbstractSigner;
  private symbolConversion: SymbolConversion;

  constructor(
    exchange: ExchangeAPI,
    infoApi: InfoAPI,
    wallet: AbstractSigner,
    symbolConversion: SymbolConversion,
  ) {
    this.exchange = exchange;
    this.infoApi = infoApi;
    this.wallet = wallet;
    this.symbolConversion = symbolConversion;
  }

  async cancelAllOrders(
    symbol?: string,
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse>> {
    try {
      const address = await this.wallet.getAddress();
      const openOrders: UserOpenOrders =
        await this.infoApi.getUserOpenOrders(address);

      let ordersToCancel: UserOpenOrders;

      for (let order of openOrders) {
        order.coin = await this.symbolConversion.convertSymbol(order.coin);
      }

      if (symbol) {
        ordersToCancel = openOrders.filter((order) => order.coin === symbol);
      } else {
        ordersToCancel = openOrders;
      }

      if (ordersToCancel.length === 0) {
        throw new Error('No orders to cancel');
      }

      const cancelRequests: CancelOrderRequest[] = ordersToCancel.map(
        (order) => ({
          coin: order.coin,
          o: order.oid,
        }),
      );

      return this.exchange.cancelOrder(cancelRequests);
    } catch (error) {
      throw error;
    }
  }

  async getAllAssets(): Promise<{ perp: string[]; spot: string[] }> {
    return await this.symbolConversion.getAllAssets();
  }

  private DEFAULT_SLIPPAGE = 0.05;

  private async getSlippagePrice(
    symbol: string,
    isBuy: boolean,
    slippage: number,
    px?: number,
  ): Promise<number> {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    if (!px) {
      const allMids = await this.infoApi.getAllMids();
      px = Number(allMids[convertedSymbol]);

      if (!allMids[convertedSymbol]) {
        throw new Error(`Was not able to convert symbol: ${symbol}`);
      }
    }

    const isSpot = symbol.includes('-SPOT');

    px *= isBuy ? 1 + slippage : 1 - slippage;

    const precision = isSpot ? 8 : 6;
    const rounded = parseFloat(px!.toPrecision(5));

    return parseFloat(rounded.toFixed(precision));
  }

  async marketOpen(
    symbol: string,
    isBuy: boolean,
    size: number,
    px?: number,
    slippage: number = this.DEFAULT_SLIPPAGE,
    cloid?: string,
    builder?: Builder,
  ): Promise<ApiResponseWithStatus<OrderResponse | string>> {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    const slippagePrice = await this.getSlippagePrice(
      convertedSymbol,
      isBuy,
      slippage,
      px,
    );

    const orderRequest: OrderRequest = {
      coin: convertedSymbol,
      is_buy: isBuy,
      sz: size,
      limit_px: slippagePrice,
      order_type: { limit: { tif: 'Ioc' } } as OrderType,
      reduce_only: false,
      builder,
    };

    if (cloid) {
      orderRequest.cloid = cloid;
    }

    return this.exchange.placeOrder(orderRequest);
  }

  async marketClose(
    symbol: string,
    size?: number,
    px?: number,
    slippage: number = this.DEFAULT_SLIPPAGE,
    cloid?: string,
  ): Promise<ApiResponseWithStatus<OrderResponse | string>> {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    const address = await this.wallet.getAddress();
    const positions =
      await this.infoApi.perpetuals.getClearinghouseState(address);
    for (const position of positions.assetPositions) {
      const item = position.position;
      if (convertedSymbol !== item.coin) {
        continue;
      }
      const szi = parseFloat(item.szi);
      const closeSize = size || Math.abs(szi);
      const isBuy = szi < 0;

      // Get aggressive Market Price
      const slippagePrice = await this.getSlippagePrice(
        convertedSymbol,
        isBuy,
        slippage,
        px,
      );

      // Market Order is an aggressive Limit Order IoC
      const orderRequest: OrderRequest = {
        coin: convertedSymbol,
        is_buy: isBuy,
        sz: closeSize,
        limit_px: slippagePrice,
        order_type: { limit: { tif: 'Ioc' } } as OrderType,
        reduce_only: true,
      };

      if (cloid) {
        orderRequest.cloid = cloid;
      }

      return this.exchange.placeOrder(orderRequest);
    }

    throw new Error(`No position found for ${convertedSymbol}`);
  }

  async closeAllPositions(
    slippage: number = this.DEFAULT_SLIPPAGE,
  ): Promise<ApiResponseWithStatus<OrderResponse | string>[]> {
    try {
      const address = await this.wallet.getAddress();
      const positions =
        await this.infoApi.perpetuals.getClearinghouseState(address);
      const closeOrders: Promise<
        ApiResponseWithStatus<OrderResponse | string>
      >[] = [];

      for (const position of positions.assetPositions) {
        const item = position.position;
        if (parseFloat(item.szi) !== 0) {
          const symbol = await this.symbolConversion.convertSymbol(
            item.coin,
            'forward',
          );
          closeOrders.push(
            this.marketClose(symbol, undefined, undefined, slippage),
          );
        }
      }

      return await Promise.all(closeOrders);
    } catch (error) {
      throw error;
    }
  }
}
