import axios, { AxiosInstance } from 'axios';
import { handleApiError } from './errors';
import { RateLimiter } from './rateLimiter';

export class HttpApi {
  private client: AxiosInstance;
  private endpoint: string;
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
    } catch (error) {
      handleApiError(error);
    }
  }
}

export const validatePublicKey = (publicKey: string): void => {
  if (!publicKey) {
    throw new Error('Public Key is required!');
  }
};
