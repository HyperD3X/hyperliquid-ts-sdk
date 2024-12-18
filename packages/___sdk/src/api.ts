import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { MAINNET_API_URL } from './utils/constants';
import { ClientError, ServerError } from './utils/error';

export class Api {
  public baseUrl: string;
  private session: AxiosInstance;

  constructor(baseUrl: string | null = null) {
    this.baseUrl = baseUrl || MAINNET_API_URL;
    this.session = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async post(urlPath: string, payload: any = null): Promise<any> {
    const data = payload || {};
    const url = this.baseUrl + urlPath;
    try {
      const response = await this.session.post(url, data);
      this.handleException(response);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return { error: `Could not parse JSON: ${error.response.data}` };
      }
      throw error;
    }
  }

  private handleException(response: AxiosResponse): void {
    const statusCode = response.status;
    if (statusCode < 400) {
      return;
    }

    if (statusCode >= 400 && statusCode < 500) {
      try {
        const err =
          typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data;
        if (!err) {
          throw new ClientError(
            statusCode,
            '',
            response.data,
            null,
            response.headers,
          );
        }
        const errorData = err.data;

        throw new ClientError(
          statusCode,
          err.code,
          err.msg,
          response.headers,
          errorData,
        );
      } catch (error) {
        if (error instanceof ClientError) {
          throw error;
        }
        throw new ClientError(
          statusCode,
          '',
          response.data,
          null,
          response.headers,
        );
      }
    }

    throw new ServerError(statusCode, response.data);
  }
}
