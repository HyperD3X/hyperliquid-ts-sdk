import { InfoAPI } from './rest/info';
import { ExchangeAPI } from './rest/exchange';
import { WebSocketClient } from './websocket/connection';
import { WebSocketSubscriptions } from './websocket/subscriptions';
import { RateLimiter } from './utils/rateLimiter';
import * as CONSTANTS from './types/constants';
import { CustomOperations } from './rest/custom';
import { BaseWallet } from 'ethers';
import { SymbolConversion } from './utils/symbolConversion';
import { AuthenticationError } from './utils/errors';

export class Hyperliquid {
  public info: InfoAPI;
  public exchange: ExchangeAPI;
  public ws: WebSocketClient;
  public subscriptions: WebSocketSubscriptions;
  public custom: CustomOperations;

  private rateLimiter: RateLimiter;
  private symbolConversion: SymbolConversion;
  private isValidWallet: boolean = false;
  private wallet: BaseWallet | null = null;

  constructor(wallet?: BaseWallet, testnet: boolean = false) {
    const baseURL = testnet
      ? CONSTANTS.BASE_URLS.TESTNET
      : CONSTANTS.BASE_URLS.PRODUCTION;

    this.rateLimiter = new RateLimiter();
    this.symbolConversion = new SymbolConversion(baseURL, this.rateLimiter);

    this.info = new InfoAPI(baseURL, this.rateLimiter, this.symbolConversion);
    this.ws = new WebSocketClient(testnet);
    this.subscriptions = new WebSocketSubscriptions(
      this.ws,
      this.symbolConversion,
    );

    // Create proxy objects for exchange and custom
    this.exchange = this.createAuthenticatedProxy(ExchangeAPI);
    this.custom = this.createAuthenticatedProxy(CustomOperations);

    if (wallet) {
      this.wallet = wallet;
      this.initializeWithWallet(wallet, testnet);
    }
  }

  private createAuthenticatedProxy<T extends object>(
    Class: new (...args: any[]) => T,
  ): T {
    return new Proxy({} as T, {
      get: (target, prop) => {
        if (!this.isValidWallet) {
          throw new AuthenticationError(
            'Invalid or missing private key. This method requires authentication.',
          );
        }
        return target[prop as keyof T];
      },
    });
  }

  private initializeWithWallet(
    wallet: BaseWallet,
    testnet: boolean = false,
  ): void {
    try {
      this.exchange = new ExchangeAPI(
        testnet,
        wallet,
        this.info,
        this.rateLimiter,
        this.symbolConversion,
      );
      this.custom = new CustomOperations(
        this.exchange,
        this.info,
        wallet,
        this.symbolConversion,
      );
      this.isValidWallet = true;
    } catch (error) {
      console.warn(
        'Invalid private key provided. Some functionalities will be limited.',
      );
      this.isValidWallet = false;

      throw error;
    }
  }

  public isAuthenticated(): boolean {
    return this.isValidWallet;
  }

  async connect(): Promise<void> {
    await this.ws.connect();
    if (!this.isValidWallet) {
      console.warn(
        'Not authenticated. Some WebSocket functionalities may be limited.',
      );
    }
  }

  disconnect(): void {
    this.ws.close();
  }
}

export * from './types';
export * from './utils/signing';
