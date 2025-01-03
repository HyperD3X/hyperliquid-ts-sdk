import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  AllMids,
  ClearinghouseState,
  Hyperliquid,
  LeverageModeEnum,
  SpotClearinghouseState,
} from 'hyperliquid-sdk';
import { ethers } from 'ethers';

let sdk = new Hyperliquid('');

type PriceView = { coin: string; price: string };

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

    sdk = new Hyperliquid(privateKey);

    const localWallet = await new ethers.Wallet(privateKey).getAddress();
    setPublicKey(localWallet);
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

  const startWebsocket = async () => {
    await sdk.connect();
    await sdk.subscriptions.subscribeToAllMids((allMids) => {
      setPrices(formatToPrices(allMids));
    });
    await sdk.subscriptions.subscribeToWebData2(publicKey!, (data) => {
      setPerpBalances(data.clearinghouseState);
      setSpotBalances(data.spotState);
    });
  };

  const formatToPrices = (allMids: AllMids): PriceView[] => {
    return Object.keys(allMids)
      .filter((coin) => !coin.startsWith('@'))
      .map((coin) => ({ coin, price: allMids[coin] }));
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

    const coin = 'PURR-SPOT';

    const apiResponse = await sdk.custom.marketOpen(coin, true, 1);

    if (apiResponse.response.data.statuses.find((status) => !!status.error)) {
      setError(JSON.stringify(apiResponse.response.data.statuses));
    }
  };

  const buyPerp = async () => {
    resetError();

    const coin = 'HYPE-PERP';

    await sdk.exchange.updateLeverage(coin, LeverageModeEnum.ISOLATED, 3);

    const apiResponse = await sdk.exchange.placeOrder({
      coin,
      is_buy: true,
      sz: 4,
      limit_px: 29,
      order_type: { limit: { tif: 'Ioc' } },
      reduce_only: false,
    });

    if (apiResponse.response.data.statuses.find((status) => !!status.error)) {
      setError(JSON.stringify(apiResponse.response.data.statuses));
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
      <button onClick={buySpot}>Buy spot (PURR for $0.01)</button>
      <button onClick={buyPerp}>Buy perp (HYPE for $0.01)</button>
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
      </div>

      <div style={{ color: 'red' }}>{error && error}</div>
    </>
  );
}

export default App;
