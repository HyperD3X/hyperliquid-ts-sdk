// src/rest/info/general.ts

import {
  AllMids,
  UserOpenOrders,
  FrontendOpenOrders,
  UserFills,
  UserRateLimit,
  OrderStatus,
  L2Book,
  CandleSnapshot,
} from '../../types';
import { HttpApi, validatePublicKey } from '../../utils/helpers';
import { SymbolConversion } from '../../utils/symbolConversion';
import { InfoType } from '../../types/constants';

export class GeneralInfoAPI {
  private httpApi: HttpApi;
  private symbolConversion: SymbolConversion;

  constructor(httpApi: HttpApi, symbolConversion: SymbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }

  async getAllMids(rawResponse: boolean = false): Promise<AllMids> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.ALL_MIDS,
    });

    if (rawResponse) {
      return response;
    } else {
      const convertedResponse: any = {};
      for (const [key, value] of Object.entries(response)) {
        const convertedKey = await this.symbolConversion.convertSymbol(key);
        convertedResponse[convertedKey] = parseFloat(value as string);
      }
      return convertedResponse;
    }
  }

  async getUserOpenOrders(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<UserOpenOrders> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest({
      type: InfoType.OPEN_ORDERS,
      user: userPublicKey,
    });

    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getReferralState(userPublicKey: string): Promise<UserOpenOrders> {
    validatePublicKey(userPublicKey);

    return this.httpApi.makeRequest({
      type: InfoType.REFERRAL,
      user: userPublicKey,
    });
  }

  async getFrontendOpenOrders(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<FrontendOpenOrders> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest(
      { type: InfoType.FRONTEND_OPEN_ORDERS, user: userPublicKey },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getUserFills(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<UserFills> {
    validatePublicKey(userPublicKey);
    const response = await this.httpApi.makeRequest(
      { type: InfoType.USER_FILLS, user: userPublicKey },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getUserFillsByTime(
    userPublicKey: string,
    startTime: number,
    endTime?: number,
    rawResponse: boolean = false,
  ): Promise<UserFills> {
    validatePublicKey(userPublicKey);

    let params: {
      user: string;
      startTime: number;
      type: string;
      endTime?: number;
    } = {
      user: userPublicKey,
      startTime: Math.round(startTime),
      type: InfoType.USER_FILLS_BY_TIME,
    };

    if (endTime) {
      params.endTime = Math.round(endTime);
    }

    const response = await this.httpApi.makeRequest(params, 20);
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getUserRateLimit(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<UserRateLimit> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest(
      { type: InfoType.USER_RATE_LIMIT, user: userPublicKey },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getOrderStatus(
    userPublicKey: string,
    oid: number | string,
    rawResponse: boolean = false,
  ): Promise<OrderStatus> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest({
      type: InfoType.ORDER_STATUS,
      user: userPublicKey,
      oid: oid,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getL2Book(coin: string, rawResponse: boolean = false): Promise<L2Book> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.L2_BOOK,
      coin: await this.symbolConversion.convertSymbol(coin, 'reverse'),
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getCandleSnapshot(
    coin: string,
    interval: string,
    startTime: number,
    endTime: number,
    rawResponse: boolean = false,
  ): Promise<CandleSnapshot> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.CANDLE_SNAPSHOT,
      req: {
        coin: await this.symbolConversion.convertSymbol(coin, 'reverse'),
        interval: interval,
        startTime: startTime,
        endTime: endTime,
      },
    });

    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response, ['s']);
  }
}
