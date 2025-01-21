import {
  SpotMeta,
  SpotClearinghouseState,
  SpotMetaAndContext,
} from '../../types';
import { HttpApi, validatePublicKey } from '../../utils/helpers';
import { InfoType } from '../../types/constants';
import { SymbolConversion } from '../../utils/symbolConversion';

export class SpotInfoAPI {
  private httpApi: HttpApi;
  private symbolConversion: SymbolConversion;

  constructor(httpApi: HttpApi, symbolConversion: SymbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }

  async getSpotMeta(rawResponse: boolean = false): Promise<SpotMeta> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.SPOT_META,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'SPOT',
        );
  }

  async getSpotClearinghouseState(
    userPublicKey: string,
    rawResponse: boolean = false,
  ): Promise<SpotClearinghouseState> {
    validatePublicKey(userPublicKey);

    const response = await this.httpApi.makeRequest({
      type: InfoType.SPOT_CLEARINGHOUSE_STATE,
      user: userPublicKey,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'SPOT',
        );
  }

  async getSpotMetaAndAssetCtxs(
    rawResponse: boolean = false,
  ): Promise<SpotMetaAndContext> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.SPOT_META_AND_ASSET_CTXS,
    });
    return rawResponse
      ? response
      : await this.symbolConversion.convertResponse(response);
  }
}
