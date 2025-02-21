import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  AllMids,
  ClearinghouseState,
  Hyperliquid,
  LeverageModeEnum,
  SpotClearinghouseState,
} from '@hyper-d3x/hyperliquid-ts-sdk';
import { ethers } from 'ethers';

let sdk = new Hyperliquid();

type PriceView = { coin: string; price: string };

const buySpotCoin = 'HYPE-SPOT';
const buyPerpCoin = 'HYPE-PERP';
const buyPerpCoinTpSl = 'BTC-PERP';

function App() {
  const mounted = useRef(false);
  const [prices, setPrices] = useState<PriceView[]>([]);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string>();
  const [spotBalances, setSpotBalances] = useState<SpotClearinghouseState>();
  const [perpBalances, setPerpBalances] = useState<ClearinghouseState>();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (mounted.current) {
      return;
    }
    load();
    mounted.current = true;
  }, []);

  const onPrivateKeyChanged = async (privateKey?: string) => {
    if (!privateKey) {
      return;
    }

    const localWallet = new ethers.Wallet(privateKey);

    sdk = new Hyperliquid(localWallet);

    setPublicKey(await localWallet.getAddress());
  };

  useEffect(() => {
    onPrivateKeyChanged(privateKey);
  }, [privateKey]);

  useEffect(() => {
    if (!publicKey) {
      return;
    }
    updatePositionsInfo();
  }, [publicKey]);

  const formatToPrices = (allMids: AllMids): PriceView[] => {
    return Object.keys(allMids)
      .filter((coin) => !coin.startsWith('@'))
      .map((coin) => ({ coin, price: `${allMids[coin]}` }));
  };

  const load = async () => {
    const allMids = await sdk.info.getAllMids();
    setPrices(formatToPrices(allMids));
  };

  const onPrivateKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrivateKey(e.target.value);
  };

  const resetError = () => {
    setError('');
  };

  const buySpot = async () => {
    resetError();

    const apiResponse = await sdk.custom.marketOpen(buySpotCoin, true, 0.5);

    if (
      typeof apiResponse.response !== 'string' &&
      apiResponse.response.data.statuses.find((status) => !!status.error)
    ) {
      setError(JSON.stringify(apiResponse.response.data.statuses));
    }
  };

  const buyPerp = async () => {
    resetError();

    await sdk.exchange.updateLeverage(
      buyPerpCoin,
      LeverageModeEnum.ISOLATED,
      3,
    );

    const apiResponse = await sdk.custom.marketOpen(buyPerpCoin, true, 4);

    if (
      typeof apiResponse.response !== 'string' &&
      apiResponse.response.data.statuses.find((status) => !!status.error)
    ) {
      setError(JSON.stringify(apiResponse.response.data.statuses));
    }
  };

  const limitOrderPerpWithTpSl = async () => {
    resetError();

    try {
      await sdk.exchange.updateLeverage(
        buyPerpCoinTpSl,
        LeverageModeEnum.ISOLATED,
        1,
      );

      await sdk.exchange.placeOrder({
        grouping: 'normalTpsl',
        orders: [
          {
            coin: 'ETH-PERP',
            is_buy: true,
            sz: 0.0039,
            limit_px: 2500,
            order_type: { limit: { tif: 'Gtc' } },
            reduce_only: false,
          },
          {
            coin: 'ETH-PERP',
            is_buy: false,
            sz: 0.0039,
            limit_px: 2500,
            order_type: {
              trigger: {
                isMarket: true,
                tpsl: 'sl',
                triggerPx: '2000',
              },
            },
            reduce_only: true,
          },
          {
            coin: 'ETH-PERP',
            is_buy: false,
            sz: 0.0039,
            limit_px: 2500,
            order_type: {
              trigger: {
                isMarket: true,
                tpsl: 'tp',
                triggerPx: '3000',
              },
            },
            reduce_only: true,
          },
        ],
      });
    } catch (e: unknown) {
      let error = e as Error;
      setError(error.message as string);
    }
  };

  const marketOrderPerpWithTpSl = async () => {
    resetError();
    const coin = 'ETH-PERP';

    try {
      await sdk.exchange.updateLeverage(
        buyPerpCoinTpSl,
        LeverageModeEnum.ISOLATED,
        1,
      );

      const price = await sdk.custom.getSlippagePrice(coin, true);

      await sdk.exchange.placeOrder({
        grouping: 'normalTpsl',
        orders: [
          {
            coin,
            is_buy: true,
            sz: 0.0039,
            limit_px: price,
            order_type: { limit: { tif: 'FrontendMarket' } },
            reduce_only: false,
          },
          {
            coin,
            is_buy: false,
            sz: 0.0039,
            limit_px: price,
            order_type: {
              trigger: {
                isMarket: true,
                tpsl: 'sl',
                triggerPx: '2000',
              },
            },
            reduce_only: true,
          },
          {
            coin,
            is_buy: false,
            sz: 0.0039,
            limit_px: price,
            order_type: {
              trigger: {
                isMarket: true,
                tpsl: 'tp',
                triggerPx: '3000',
              },
            },
            reduce_only: true,
          },
        ],
      });
    } catch (e: unknown) {
      let error = e as Error;
      setError(error.message as string);
    }
  };

  const addTpSlToPosition = async () => {
    resetError();
    const coin = 'ETH-PERP';

    try {
      await sdk.exchange.updateLeverage(
        buyPerpCoinTpSl,
        LeverageModeEnum.ISOLATED,
        1,
      );

      await sdk.exchange.placeOrder({
        grouping: 'positionTpsl',
        orders: [
          {
            coin,
            is_buy: false,
            sz: 0.0039,
            limit_px: 2500,
            order_type: {
              trigger: {
                isMarket: true,
                tpsl: 'sl',
                triggerPx: '2000',
              },
            },
            reduce_only: true,
          },
        ],
      });
    } catch (e: unknown) {
      let error = e as Error;
      setError(error.message as string);
    }
  };

  const updatePositionsInfo = async () => {
    setSpotBalances(await sdk.info.spot.getSpotClearinghouseState(publicKey!));
    setPerpBalances(
      await sdk.info.perpetuals.getClearinghouseState(publicKey!),
    );
  };

  const onPositionsRefresh = async () => {
    await updatePositionsInfo();
  };

  const onAutoRefresh = () => {
    startWebsocket();
  };

  const startWebsocket = async () => {
    await sdk.connect();
    await sdk.subscriptions.subscribeToAllMids((allMids) => {
      setPrices(formatToPrices(allMids));
    });
    await sdk.subscriptions.subscribeToWebData2(publicKey!, (data) => {
      console.log('web2 data', data);
      setPerpBalances(data.clearinghouseState);
      setSpotBalances(data.spotState);
    });
    await sdk.subscriptions.subscribeToCandle('BTC-PERP', '1h', (data) => {
      console.log('candle data', data);
    });
    await sdk.subscriptions.subscribeToCandle('HYPE-SPOT', '1h', (data) => {
      console.log('candle data', data);
    });
  };

  const onAutoRefreshDisable = async () => {
    await sdk.subscriptions.unsubscribeFromAllMids();
    await sdk.subscriptions.unsubscribeFromWebData2(publicKey!);
    await sdk.subscriptions.unsubscribeFromCandle('BTC-PERP', '1h');
    await sdk.subscriptions.unsubscribeFromCandle('HYPE-SPOT', '1h');
  };

  const onSpotToPerp = async () => {
    console.log(await sdk.exchange.transferBetweenSpotAndPerp(1, true));
  };

  const onUserFees = async () => {
    console.log(await sdk.info.getUserFees(publicKey!));
  };

  const onUserPortfolio = async () => {
    console.log(await sdk.info.getUserPortfolio(publicKey!));
  };

  const getTokenDetails = async () => {
    console.log(
      await sdk.info.getTokenDetails('0xc1fb593aeffbeb02f85e0308e9956a90'),
    );
  };

  return (
    <>
      <h1>Playground</h1>
      <h4>Tokens:</h4>
      {prices && (
        <>
          <div>Coins:</div>
          <div
            style={{
              height: '300px',
              overflow: 'hidden',
              overflowY: 'scroll',
              border: '1px solid grey',
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((priceObj) => (
                  <tr key={`row-${priceObj.coin}`}>
                    <td key={`coin-${priceObj.coin}`}>{priceObj.coin}</td>
                    <td key={`price-$${priceObj.coin}`}>${priceObj.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h4>Wallet</h4>
      <div>
        <div>Your private key:</div>
        <input onChange={onPrivateKeyChange} value={privateKey} />
      </div>
      {publicKey && <div>Your public key: {publicKey}</div>}
      <h4>Purchase:</h4>
      <button onClick={buySpot}>Buy spot ({buySpotCoin})</button>
      <button onClick={buyPerp}>Buy perp ({buyPerpCoin})</button>
      <button onClick={limitOrderPerpWithTpSl}>Limit Perp with TP/SL</button>
      <button onClick={marketOrderPerpWithTpSl}>Market Perp with TP/SL</button>
      <button onClick={addTpSlToPosition}>Add TP/SL to position</button>
      <h4>Positions:</h4>
      {spotBalances &&
        spotBalances.balances.map((balance, index) => (
          <div key={index}>
            {balance.coin} {balance.hold} {balance.total}
          </div>
        ))}
      {perpBalances &&
        perpBalances.assetPositions.map((position, index) => (
          <div key={index}>
            {position.position.coin}&nbsp; Size: {position.position.szi}&nbsp;
            Entry price: ${position.position.entryPx}&nbsp; Value:{' '}
            {position.position.positionValue}&nbsp; Margin: $
            {position.position.marginUsed}&nbsp; PnL: $
            {position.position.unrealizedPnl}&nbsp;
          </div>
        ))}
      <div>
        <button onClick={onPositionsRefresh}>Refresh positions</button>
      </div>
      <div>
        <button onClick={onAutoRefresh}>Enable real-time updates</button>
        <button onClick={onAutoRefreshDisable}>
          Disable real-time updates
        </button>
      </div>
      <div>
        <button onClick={onSpotToPerp}>Spot to Perp transfer</button>
      </div>
      <div>
        <button onClick={onUserFees}>Fetch user fees</button>
      </div>
      <div>
        <button onClick={onUserPortfolio}>Fetch user portfolio</button>
      </div>
      <div>
        <button onClick={getTokenDetails}>Get token details (PURR)</button>
      </div>

      <div style={{ color: 'red' }}>{error && error}</div>
    </>
  );
}

export default App;
