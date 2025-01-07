import { AxiosError } from 'axios';

export class HyperliquidAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HyperliquidAPIError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function handleApiError(error: AxiosError) {
  if (error.message) {
    throw new HyperliquidAPIError(error.message);
  }

  if (error.response?.status && error.response.statusText) {
    throw new HyperliquidAPIError(
      `API request has failed with status: ${error.response.status} and text: ${error.response.statusText}`,
    );
  }

  if (error.request) {
    throw new HyperliquidAPIError('No response received from the server');
  }

  throw error;
}
