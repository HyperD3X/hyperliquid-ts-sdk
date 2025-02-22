import {
    Meta,
    ClearinghouseState,
    UserFunding,
    UserNonFundingLedgerUpdates,
    FundingHistory, PerpMetaAndContext,
} from '../../types';
import { HttpApi, validatePublicKey } from '../../utils/helpers';
import { InfoType } from '../../types/constants';
import { SymbolConversion } from '../../utils/symbolConversion';

export class PerpetualsInfoAPI {
  private httpApi: HttpApi;
  private symbolConversion: SymbolConversion;

  constructor(httpApi: HttpApi, symbolConversion: SymbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }

  async getMeta(rawResponse: boolean = false): Promise<Meta> {
    const response = await this.httpApi.makeRequest({ type: InfoType.META });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'PERP',
        );
  }

  async getMetaAndAssetCtxs(
    rawResponse: boolean = false,
  ): Promise<PerpMetaAndContext> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.PERPS_META_AND_ASSET_CTXS,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'PERP',
        );
  }

  async getClearinghouseState(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<ClearinghouseState> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest({
      type: InfoType.PERPS_CLEARINGHOUSE_STATE,
      user: userPublicKey,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getUserFunding(
    userPublicKey: string,
    startTime: number,
    endTime?: number,
    rawResponse: boolean = false,
  ): Promise<UserFunding> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest(
      {
        type: InfoType.USER_FUNDING,
        user: userPublicKey,
        startTime: startTime,
        endTime: endTime,
      },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getUserNonFundingLedgerUpdates(
    userPublicKey: string,
    startTime: number,
    endTime?: number,
    rawResponse: boolean = false,
  ): Promise<UserNonFundingLedgerUpdates> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest(
      {
        type: InfoType.USER_NON_FUNDING_LEDGER_UPDATES,
        user: userPublicKey,
        startTime: startTime,
        endTime: endTime,
      },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }

  async getFundingHistory(
    coin: string,
    startTime: number,
    endTime?: number,
    rawResponse: boolean = false,
  ): Promise<FundingHistory> {
    const response = await this.httpApi.makeRequest(
      {
        type: InfoType.FUNDING_HISTORY,
        coin: await this.symbolConversion.convertSymbol(coin, 'reverse'),
        startTime: startTime,
        endTime: endTime,
      },
      20,
    );
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }
}
