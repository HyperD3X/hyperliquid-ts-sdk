import { Web3Account } from 'web3-eth-accounts';
import { LocalAccount } from 'web3-eth-accounts/signers/local';

import { Api } from './api';
import { Info } from './info';
import { MAINNET_API_URL } from './utils/constants';
import {
  CancelByCloidRequest,
  CancelRequest,
  ModifyRequest,
  OidOrCloid,
  OrderRequest,
  OrderType,
  OrderWire,
  ScheduleCancelAction,
  floatToUsdInt,
  getTimestampMs,
  orderRequestToOrderWire,
  orderWiresToOrderAction,
  signAgent,
  signApproveBuilderFee,
  signL1Action,
  signSpotTransferAction,
  signUsdClassTransferAction,
  signUsdTransferAction,
  signWithdrawFromBridgeAction,
  signConvertToMultiSigUserAction,
  signMultiSigAction,
} from './utils/signing';
import { BuilderInfo, Cloid, Meta, Signature, SpotMeta } from './utils/types';

export class Exchange extends Api {
  // Default Max Slippage for Market Orders 5%
  static DEFAULT_SLIPPAGE = 0.05;

  private info: Info;

  constructor(
    readonly wallet: LocalAccount,
    baseUrl: string,
    readonly vaultAddress: string,
    meta?: Meta,
    readonly accountAddress?: string,
    spotMeta?: SpotMeta,
  ) {
    super(baseUrl);

    // this.wallet = wallet;
    // this.vaultAddress = vaultAddress;
    // this.accountAddress = accountAddress;
    this.info = new Info(baseUrl, true, meta, spotMeta);
  }

  private async postAction(action: any, signature: Signature, nonce: number) {
    const payload = {
      action: action,
      nonce: nonce,
      signature: signature,
      vaultAddress:
        action.type !== 'usdClassTransfer' ? this.vaultAddress : null,
    };
    return this.post('/exchange', payload);
  }

  private slippagePrice(
    name: string,
    isBuy: boolean,
    slippage: number,
    px?: number,
  ): number {
    const coin = this.info.nameToCoin[name];
    if (px === undefined) {
      // Get midprice
      px = parseFloat(this.info.allMids()[coin]);
    }

    // spot assets start at 10000
    const isSpot = this.info.coinToAsset[coin] >= 10000;

    // Calculate Slippage
    if (isBuy) {
      px *= 1 + slippage;
    } else {
      px *= 1 - slippage;
    }
    // We round px to 5 significant figures and 6 decimals for perps, 8 decimals for spot
    return parseFloat(px.toFixed(isSpot ? 8 : 6));
  }

  async order(
    name: string,
    isBuy: boolean,
    sz: number,
    limitPx: number,
    orderType: OrderType,
    reduceOnly: boolean = false,
    cloid?: Cloid,
    builder?: BuilderInfo,
  ): Promise<any> {
    const order: OrderRequest = {
      coin: name,
      is_buy: isBuy,
      sz: sz,
      limit_px: limitPx,
      order_type: orderType,
      reduce_only: reduceOnly,
    };
    if (cloid) {
      order.cloid = cloid;
    }
    return this.bulkOrders([order], builder);
  }

  async bulkOrders(
    orderRequests: Array<OrderRequest>,
    builder?: BuilderInfo,
  ): Promise<any> {
    const orderWires: Array<OrderWire> = orderRequests.map((order) =>
      orderRequestToOrderWire(order, this.info.nameToAsset(order.coin)),
    );
    const timestamp = getTimestampMs();

    if (builder) {
      builder.b = builder.b.toLowerCase();
    }
    const orderAction = orderWiresToOrderAction(orderWires, builder);

    const signature = await signL1Action(
      this.wallet,
      orderAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );

    return this.postAction(orderAction, signature, timestamp);
  }

  async modifyOrder(
    oid: OidOrCloid,
    name: string,
    isBuy: boolean,
    sz: number,
    limitPx: number,
    orderType: OrderType,
    reduceOnly: boolean = false,
    cloid?: Cloid,
  ): Promise<any> {
    const modify: ModifyRequest = {
      oid: oid,
      order: {
        coin: name,
        is_buy: isBuy,
        sz: sz,
        limit_px: limitPx,
        order_type: orderType,
        reduce_only: reduceOnly,
        cloid: cloid,
      },
    };
    return this.bulkModifyOrdersNew([modify]);
  }

  async bulkModifyOrdersNew(
    modifyRequests: Array<ModifyRequest>,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    const modifyWires = modifyRequests.map((modify) => ({
      oid: modify.oid instanceof Cloid ? modify.oid.toRaw() : modify.oid,
      order: orderRequestToOrderWire(
        modify.order,
        this.info.nameToAsset(modify.order.coin),
      ),
    }));

    const modifyAction = {
      type: 'batchModify',
      modifies: modifyWires,
    };

    const signature = await signL1Action(
      this.wallet,
      modifyAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );

    return this.postAction(modifyAction, signature, timestamp);
  }

  async marketOpen(
    name: string,
    isBuy: boolean,
    sz: number,
    px?: number,
    slippage: number = Exchange.DEFAULT_SLIPPAGE,
    cloid?: Cloid,
    builder?: BuilderInfo,
  ): Promise<any> {
    // Get aggressive Market Price
    px = this.slippagePrice(name, isBuy, slippage, px);
    // Market Order is an aggressive Limit Order IoC
    return this.order(
      name,
      isBuy,
      sz,
      px,
      { limit: { tif: 'Ioc' } },
      false,
      cloid,
      builder,
    );
  }

  async marketClose(
    coin: string,
    sz?: number,
    px?: number,
    slippage: number = Exchange.DEFAULT_SLIPPAGE,
    cloid?: Cloid,
    builder?: BuilderInfo,
  ): Promise<any> {
    let address = this.wallet.address;
    if (this.accountAddress) {
      address = this.accountAddress;
    }
    if (this.vaultAddress) {
      address = this.vaultAddress;
    }
    const positions = this.info.userState(address).assetPositions;
    for (const position of positions) {
      const item = position.position;
      if (coin !== item.coin) {
        continue;
      }
      const szi = parseFloat(item.szi);
      if (sz === undefined) {
        sz = Math.abs(szi);
      }
      const isBuy = szi < 0;
      // Get aggressive Market Price
      px = this.slippagePrice(coin, isBuy, slippage, px);
      // Market Order is an aggressive Limit Order IoC
      return this.order(
        coin,
        isBuy,
        sz,
        px,
        { limit: { tif: 'Ioc' } },
        true,
        cloid,
        builder,
      );
    }
  }

  async cancel(name: string, oid: number): Promise<any> {
    return this.bulkCancel([{ coin: name, oid: oid }]);
  }

  async cancelByCloid(name: string, cloid: Cloid): Promise<any> {
    return this.bulkCancelByCloid([{ coin: name, cloid: cloid }]);
  }

  async bulkCancel(cancelRequests: Array<CancelRequest>): Promise<any> {
    const timestamp = getTimestampMs();
    const cancelAction = {
      type: 'cancel',
      cancels: cancelRequests.map((cancel) => ({
        a: this.info.nameToAsset(cancel.coin),
        o: cancel.oid,
      })),
    };
    const signature = await signL1Action(
      this.wallet,
      cancelAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );

    return this.postAction(cancelAction, signature, timestamp);
  }

  async bulkCancelByCloid(
    cancelRequests: Array<CancelByCloidRequest>,
  ): Promise<any> {
    const timestamp = getTimestampMs();

    const cancelAction = {
      type: 'cancelByCloid',
      cancels: cancelRequests.map((cancel) => ({
        asset: this.info.nameToAsset(cancel.coin),
        cloid: cancel.cloid.toRaw(),
      })),
    };
    const signature = await signL1Action(
      this.wallet,
      cancelAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );

    return this.postAction(cancelAction, signature, timestamp);
  }

  async scheduleCancel(time?: number): Promise<any> {
    /** Schedules a time (in UTC millis) to cancel all open orders. The time must be at least 5 seconds after the current time.
     * Once the time comes, all open orders will be canceled and a trigger count will be incremented. The max number of triggers
     * per day is 10. This trigger count is reset at 00:00 UTC.
     *
     * Args:
     *     time (int): if time is not None, then set the cancel time in the future. If None, then unsets any cancel time in the future.
     */
    const timestamp = getTimestampMs();
    const scheduleCancelAction: ScheduleCancelAction = {
      type: 'scheduleCancel',
    };
    if (time !== undefined) {
      scheduleCancelAction.time = time;
    }
    const signature = await signL1Action(
      this.wallet,
      scheduleCancelAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(scheduleCancelAction, signature, timestamp);
  }

  async updateLeverage(
    leverage: number,
    name: string,
    isCross: boolean = true,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    const updateLeverageAction = {
      type: 'updateLeverage',
      asset: this.info.nameToAsset(name),
      isCross: isCross,
      leverage: leverage,
    };
    const signature = await signL1Action(
      this.wallet,
      updateLeverageAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(updateLeverageAction, signature, timestamp);
  }

  async updateIsolatedMargin(amount: number, name: string): Promise<any> {
    const timestamp = getTimestampMs();
    amount = floatToUsdInt(amount);
    const updateIsolatedMarginAction = {
      type: 'updateIsolatedMargin',
      asset: this.info.nameToAsset(name),
      isBuy: true,
      ntli: amount,
    };
    const signature = await signL1Action(
      this.wallet,
      updateIsolatedMarginAction,
      this.vaultAddress,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(updateIsolatedMarginAction, signature, timestamp);
  }

  async setReferrer(code: string): Promise<any> {
    const timestamp = getTimestampMs();
    const setReferrerAction = {
      type: 'setReferrer',
      code: code,
    };
    const signature = await signL1Action(
      this.wallet,
      setReferrerAction,
      null,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(setReferrerAction, signature, timestamp);
  }

  async createSubAccount(name: string): Promise<any> {
    const timestamp = getTimestampMs();
    const createSubAccountAction = {
      type: 'createSubAccount',
      name: name,
    };
    const signature = await signL1Action(
      this.wallet,
      createSubAccountAction,
      null,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(createSubAccountAction, signature, timestamp);
  }

  async usdClassTransfer(amount: number, toPerp: boolean): Promise<any> {
    const timestamp = getTimestampMs();
    let strAmount = String(amount);
    if (this.vaultAddress) {
      strAmount += ` subaccount:${this.vaultAddress}`;
    }

    const action = {
      type: 'usdClassTransfer',
      amount: strAmount,
      toPerp: toPerp,
      nonce: timestamp,
    };
    const signature = await signUsdClassTransferAction(
      this.wallet,
      action,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(action, signature, timestamp);
  }

  async subAccountTransfer(
    subAccountUser: string,
    isDeposit: boolean,
    usd: number,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    const subAccountTransferAction = {
      type: 'subAccountTransfer',
      subAccountUser: subAccountUser,
      isDeposit: isDeposit,
      usd: usd,
    };
    const signature = await signL1Action(
      this.wallet,
      subAccountTransferAction,
      null,
      timestamp,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(subAccountTransferAction, signature, timestamp);
  }

  async vaultUsdTransfer(
    vaultAddress: string,
    isDeposit: boolean,
    usd: number,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    const vaultTransferAction = {
      type: 'vaultTransfer',
      vaultAddress: vaultAddress,
      isDeposit: isDeposit,
      usd: usd,
    };
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const signature = await signL1Action(
      this.wallet,
      vaultTransferAction,
      null,
      timestamp,
      isMainnet,
    );
    return this.postAction(vaultTransferAction, signature, timestamp);
  }

  async usdTransfer(amount: number, destination: string): Promise<any> {
    const timestamp = getTimestampMs();
    const action = {
      destination: destination,
      amount: String(amount),
      time: timestamp,
      type: 'usdSend',
    };
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const signature = await signUsdTransferAction(this.wallet, action, isMainnet);
    return this.postAction(action, signature, timestamp);
  }

  async spotTransfer(
    amount: number,
    destination: string,
    token: string,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    const action = {
      destination: destination,
      amount: String(amount),
      token: token,
      time: timestamp,
      type: 'spotSend',
    };
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const signature = await signSpotTransferAction(this.wallet, action, isMainnet);
    return this.postAction(action, signature, timestamp);
  }

  async withdrawFromBridge(amount: number, destination: string): Promise<any> {
    const timestamp = getTimestampMs();
    const action = {
      destination: destination,
      amount: String(amount),
      time: timestamp,
      type: 'withdraw3',
    };
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const signature = await signWithdrawFromBridgeAction(
      this.wallet,
      action,
      isMainnet,
    );
    return this.postAction(action, signature, timestamp);
  }

  async approveAgent(name?: string): Promise<[any, string]> {
    const agentKey = '0x' + secrets.tokenHex(32);
    const account = Web3Account.fromKey(agentKey);
    const timestamp = getTimestampMs();
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const action = {
      type: 'approveAgent',
      agentAddress: account.address,
      agentName: name || '',
      nonce: timestamp,
    };
    const signature = await signAgent(this.wallet, action, isMainnet);
    if (name === undefined) {
      delete action.agentName;
    }

    return [await this.postAction(action, signature, timestamp), agentKey];
  }

  async approveBuilderFee(builder: string, maxFeeRate: string): Promise<any> {
    const timestamp = getTimestampMs();

    const action = {
      maxFeeRate: maxFeeRate,
      builder: builder,
      nonce: timestamp,
      type: 'approveBuilderFee',
    };
    const signature = await signApproveBuilderFee(
      this.wallet,
      action,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(action, signature, timestamp);
  }

  async convertToMultiSigUser(
    authorizedUsers: Array<string>,
    threshold: number,
  ): Promise<any> {
    const timestamp = getTimestampMs();
    authorizedUsers = authorizedUsers.sort();
    const signers = {
      authorizedUsers: authorizedUsers,
      threshold: threshold,
    };
    const action = {
      type: 'convertToMultiSigUser',
      signers: JSON.stringify(signers),
      nonce: timestamp,
    };
    const signature = await signConvertToMultiSigUserAction(
      this.wallet,
      action,
      this.baseUrl === MAINNET_API_URL,
    );
    return this.postAction(action, signature, timestamp);
  }

  async multiSig(
    multiSigUser: string,
    innerAction: any,
    signatures: any,
    nonce: number,
    vaultAddress?: string,
  ): Promise<any> {
    multiSigUser = multiSigUser.toLowerCase();
    const multiSigAction = {
      type: 'multiSig',
      signatureChainId: '0x66eee',
      signatures: signatures,
      payload: {
        multiSigUser: multiSigUser,
        outerSigner: this.wallet.address.toLowerCase(),
        action: innerAction,
      },
    };
    const isMainnet = this.baseUrl === MAINNET_API_URL;
    const signature = await signMultiSigAction(
      this.wallet,
      multiSigAction,
      isMainnet,
      vaultAddress,
      nonce,
    );
    return this.postAction(multiSigAction, signature, nonce);
  }
}
