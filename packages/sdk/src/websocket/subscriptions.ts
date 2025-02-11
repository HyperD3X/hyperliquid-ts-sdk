import { WebSocketClient } from './connection';
import {
  AllMids,
  WsBook,
  WsOrder,
  WsUserEvent,
  Notification,
  WebData2,
  WsUserFills,
  WsUserFundings,
  WsUserNonFundingLedgerUpdates,
  WsUserActiveAssetData,
  CandleSnapshot,
} from '../types/index';
import { SymbolConversion } from '../utils/symbolConversion';

export class WebSocketSubscriptions {
  private ws: WebSocketClient;
  private symbolConversion: SymbolConversion;
  private websocketHandlers = new Map<string, (message: any) => void>();

  constructor(ws: WebSocketClient, symbolConversion: SymbolConversion) {
    this.ws = ws;
    this.symbolConversion = symbolConversion;
  }

  private async subscribe(subscription: {
    type: string;
    [key: string]: any;
  }): Promise<void> {
    this.ws.sendMessage({
      method: 'subscribe',
      subscription: subscription,
    });
  }

  private async unsubscribe(subscription: {
    type: string;
    [key: string]: any;
  }): Promise<void> {
    let convertedSubscription = subscription;
    // TODO: get rid of generic symbol conversion and make it explicitly in each unsubscribe method
    if (subscription.type !== 'candle') {
      convertedSubscription =
        await this.symbolConversion.convertSymbolsInObject(subscription);
    }

    this.ws.sendMessage({
      method: 'unsubscribe',
      subscription: convertedSubscription,
    });
  }

  async subscribeToAllMids(callback: (data: AllMids) => void): Promise<void> {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    await this.addHandlerForSubscription(
      { type: 'allMids' },
      async (message: any) => {
        if (message.channel === 'allMids') {
          if (message.data.mids) {
            const convertedData: AllMids = {};
            for (const [key, value] of Object.entries(message.data.mids)) {
              const convertedKey =
                await this.symbolConversion.convertSymbol(key);
              convertedData[convertedKey] =
                this.symbolConversion.convertToNumber(value);
            }
            callback(convertedData);
          }
        }
      },
    );
  }

  async subscribeToNotification(
    user: string,
    callback: (data: Notification & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'notification', user: user },
      async (message: any) => {
        if (message.channel === 'notification') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  // TODO add types for "subscriptionParams"
  private async addHandlerForSubscription(
    subscriptionParams: any,
    handler: (message: any) => Promise<void>,
  ) {
    await this.subscribe(subscriptionParams);

    const key = JSON.stringify(subscriptionParams);
    if (this.websocketHandlers.has(key)) {
      return;
    }

    this.websocketHandlers.set(key, handler);

    this.ws.on('message', handler);
  }

  async subscribeToWebData2(
    user: string,
    callback: (data: WebData2) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'webData2', user: user },
      async (message: any) => {
        if (message.channel === 'webData2') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToCandle(
    coin: string,
    interval: string,
    callback: (data: CandleSnapshot) => void,
  ): Promise<void> {
    const convertedCoin = await this.symbolConversion.convertSymbol(
      coin,
      'reverse',
    );

    await this.addHandlerForSubscription(
      {
        type: 'candle',
        coin: convertedCoin,
        interval: interval,
      },
      async (message: any) => {
        if (
          message.channel === 'candle' &&
          message.data.s === convertedCoin &&
          message.data.i === interval
        ) {
          message.data.s = coin;
          callback(message.data);
        }
      },
    );
  }

  async subscribeToL2Book(
    coin: string,
    callback: (data: WsBook & { coin: string }) => void,
  ): Promise<void> {
    const convertedCoin = await this.symbolConversion.convertSymbol(
      coin,
      'reverse',
    );

    await this.addHandlerForSubscription(
      { type: 'l2Book', coin: convertedCoin },
      async (message: any) => {
        if (
          message.channel === 'l2Book' &&
          message.data.coin === convertedCoin
        ) {
          message = await this.symbolConversion.convertSymbolsInObject(
            message,
            ['coin'],
          );
          callback(message.data);
        }
      },
    );
  }

  async subscribeToTrades(
    coin: string,
    callback: (data: any) => void,
  ): Promise<void> {
    const convertedCoin = await this.symbolConversion.convertSymbol(
      coin,
      'reverse',
    );

    await this.addHandlerForSubscription(
      { type: 'trades', coin: convertedCoin },
      async (message: any) => {
        if (
          message.channel === 'trades' &&
          message.data[0].coin === convertedCoin
        ) {
          message = await this.symbolConversion.convertSymbolsInObject(
            message,
            ['coin'],
          );
          callback(message.data);
        }
      },
    );
  }

  async subscribeToOrderUpdates(
    user: string,
    callback: (data: WsOrder[] & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'orderUpdates', user: user },
      async (message: any) => {
        if (message.channel === 'orderUpdates') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToUserEvents(
    user: string,
    callback: (data: WsUserEvent & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'userEvents', user: user },
      async (message: any) => {
        if (message.channel === 'userEvents') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToUserFills(
    user: string,
    callback: (data: WsUserFills & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'userFills', user: user },
      async (message: any) => {
        if (message.channel === 'userFills') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToUserFundings(
    user: string,
    callback: (data: WsUserFundings & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'userFundings', user: user },
      async (message: any) => {
        if (message.channel === 'userFundings') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToUserNonFundingLedgerUpdates(
    user: string,
    callback: (data: WsUserNonFundingLedgerUpdates & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'userNonFundingLedgerUpdates', user: user },
      async (message: any) => {
        if (message.channel === 'userNonFundingLedgerUpdates') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async subscribeToUserActiveAssetData(
    user: string,
    coin: string,
    callback: (data: WsUserActiveAssetData & { user: string }) => void,
  ): Promise<void> {
    await this.addHandlerForSubscription(
      { type: 'activeAssetData', user: user, coin: coin },
      async (message: any) => {
        if (message.channel === 'activeAssetData') {
          message = await this.symbolConversion.convertSymbolsInObject(message);
          callback(message.data);
        }
      },
    );
  }

  async postRequest(
    requestType: 'info' | 'action',
    payload: any,
  ): Promise<any> {
    const id = Date.now();
    const convertedPayload =
      await this.symbolConversion.convertSymbolsInObject(payload);

    this.ws.sendMessage({
      method: 'post',
      id: id,
      request: {
        type: requestType,
        payload: convertedPayload,
      },
    });

    return new Promise((resolve, reject) => {
      const responseHandler = (message: any) => {
        if (typeof message === 'object' && message !== null) {
          const data = message.data || message;
          if (data.channel === 'post' && data.id === id) {
            this.ws.removeListener('message', responseHandler);
            if (data.response && data.response.type === 'error') {
              reject(new Error(data.response.payload));
            } else {
              const convertedResponse =
                this.symbolConversion.convertSymbolsInObject(
                  data.response ? data.response.payload : data,
                );
              resolve(convertedResponse);
            }
          }
        }
      };

      this.ws.on('message', responseHandler);

      setTimeout(() => {
        this.ws.removeListener('message', responseHandler);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }

  async unsubscribeFromAllMids(): Promise<void> {
    this.unsubscribe({ type: 'allMids' });
  }

  async unsubscribeFromNotification(user: string): Promise<void> {
    this.unsubscribe({ type: 'notification', user: user });
  }

  // TODO: Add types for subscriptionParams
  private async removeHandlerForSubscription(subscriptionParams: any) {
    await this.unsubscribe(subscriptionParams);
    const key = JSON.stringify(subscriptionParams);
    if (this.websocketHandlers.has(key)) {
      this.ws.off('message', this.websocketHandlers.get(key)!);
      this.websocketHandlers.delete(key);
    }
  }

  async unsubscribeFromWebData2(user: string): Promise<void> {
    await this.removeHandlerForSubscription({ type: 'webData2', user: user });
  }

  async unsubscribeFromCandle(coin: string, interval: string): Promise<void> {
    const convertedCoin = await this.symbolConversion.convertSymbol(
      coin,
      'reverse',
    );

    await this.removeHandlerForSubscription({
      type: 'candle',
      coin: convertedCoin,
      interval: interval,
    });
  }

  async unsubscribeFromL2Book(coin: string): Promise<void> {
    await this.removeHandlerForSubscription({ type: 'l2Book', coin: coin });
  }

  async unsubscribeFromTrades(coin: string): Promise<void> {
    await this.removeHandlerForSubscription({ type: 'trades', coin: coin });
  }

  async unsubscribeFromOrderUpdates(user: string): Promise<void> {
    await this.removeHandlerForSubscription({
      type: 'orderUpdates',
      user: user,
    });
  }

  async unsubscribeFromUserEvents(user: string): Promise<void> {
    await this.removeHandlerForSubscription({ type: 'userEvents', user: user });
  }

  async unsubscribeFromUserFills(user: string): Promise<void> {
    await this.removeHandlerForSubscription({ type: 'userFills', user: user });
  }

  async unsubscribeFromUserFundings(user: string): Promise<void> {
    await this.removeHandlerForSubscription({
      type: 'userFundings',
      user: user,
    });
  }

  async unsubscribeFromUserNonFundingLedgerUpdates(
    user: string,
  ): Promise<void> {
    await this.removeHandlerForSubscription({
      type: 'userNonFundingLedgerUpdates',
      user: user,
    });
  }

  async unsubscribeFromUserActiveAssetData(
    user: string,
    coin: string,
  ): Promise<void> {
    await this.removeHandlerForSubscription({
      type: 'activeAssetData',
      user: user,
      coin: coin,
    });
  }
}
