import axios, { AxiosInstance } from 'axios';
import { handleApiError, HyperliquidAPIError } from './errors';
import { RateLimiter } from './rateLimiter';
import { LOG_PREFIX } from '../types/constants';

export class HttpApi {
  private client: AxiosInstance;
  private endpoint: string;
  // TODO: Rework rate limiter
  private rateLimiter: RateLimiter;

  constructor(
    baseUrl: string,
    endpoint: string = '/',
    rateLimiter: RateLimiter,
  ) {
    this.endpoint = endpoint;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.rateLimiter = rateLimiter;
  }

  async makeRequest<T>(payload: any, weight: number = 2): Promise<T> {
    try {
      await this.rateLimiter.waitForToken(weight);

      return (await this.client.post(this.endpoint, payload)).data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        handleApiError(error);
      } else if (error instanceof Error) {
        throw new HyperliquidAPIError(`Unknown error: ${error.message}`);
      }

      console.error(`${LOG_PREFIX} Unhandled error type: `, error);
      throw error;
    }
  }
}

export const validatePublicKey = (publicKey: string): void => {
  if (!publicKey) {
    throw new Error('Public Key is required!');
  }
};
