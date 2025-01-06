// src/rest/custom.ts

import { ethers } from 'ethers';
import { InfoAPI } from './info';
import { ExchangeAPI } from './exchange';
import {
  ApiResponseWithStatus,
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
import { floatToWire } from '../utils/signing';

export class CustomOperations {
  private exchange: ExchangeAPI;
  private infoApi: InfoAPI;
  private wallet: ethers.Wallet;
  private symbolConversion: SymbolConversion;
  private walletAddress: string | null;

  constructor(
    exchange: ExchangeAPI,
    infoApi: InfoAPI,
    privateKey: string,
    symbolConversion: SymbolConversion,
    walletAddress: string | null = null,
  ) {
    this.exchange = exchange;
    this.infoApi = infoApi;
    this.wallet = new ethers.Wallet(privateKey);
    this.symbolConversion = symbolConversion;
    this.walletAddress = walletAddress;
  }

  async cancelAllOrders(
    symbol?: string,
  ): Promise<ApiResponseWithStatus<CommonSuccessOrErrorResponse>> {
    try {
      const address = this.walletAddress || this.wallet.address;
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
    }

    const isSpot = symbol.includes('-SPOT');

    //If not isSpot count how many decimals price has to use the same amount for rounding
    const decimals = px.toString().split('.')[1]?.length || 0;

    console.log(decimals);

    px *= isBuy ? 1 + slippage : 1 - slippage;
    const spotDecimals = px < 1 ? 5 : 8; // TODO: Check the calculation here: https://github.com/ccxt/ccxt/issues/23516 and here: https://github.com/gaardiolor/ccxt/commit/de43976f408007bf2a8555141b13936735645702#diff-bafe810770b7e09d82844d4f5b0efc778f4e2024f8dfb7973faa9cf603d0ca0eR456
    return Number(px.toFixed(isSpot ? spotDecimals : decimals - 1));
  }

  async marketOpen(
    symbol: string,
    isBuy: boolean,
    size: number,
    px?: number,
    slippage: number = this.DEFAULT_SLIPPAGE,
    cloid?: string,
  ): Promise<ApiResponseWithStatus<OrderResponse>> {
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
    };

    if (cloid) {
      orderRequest.cloid = cloid;
    }

    console.log('orderRequest', orderRequest);

    return this.exchange.placeOrder(orderRequest);
  }

  async marketClose(
    symbol: string,
    size?: number,
    px?: number,
    slippage: number = this.DEFAULT_SLIPPAGE,
    cloid?: string,
  ): Promise<ApiResponseWithStatus<OrderResponse>> {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    const address = this.walletAddress || this.wallet.address;
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
  ): Promise<ApiResponseWithStatus<OrderResponse>[]> {
    try {
      const address = this.walletAddress || this.wallet.address;
      const positions =
        await this.infoApi.perpetuals.getClearinghouseState(address);
      const closeOrders: Promise<ApiResponseWithStatus<OrderResponse>>[] = [];

      console.log(positions);

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
