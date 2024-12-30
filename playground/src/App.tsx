import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  ClearinghouseState,
  Hyperliquid,
  SpotClearinghouseState,
} from 'hyperliquid-sdk';
import { ethers } from 'ethers';

let sdk = new Hyperliquid('');

function App() {
  const mounted = useRef(false);
  const [spot, setSpot] = useState<string[]>([]);
  const [perps, setPerps] = useState<string[]>([]);
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
    updatePositionsInfo();
  }, [publicKey]);

  const load = async () => {
    const assets = await sdk.info.getAllAssets();

    setSpot(assets.spot);
    setPerps(assets.perp);
  };

  const onPrivateKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrivateKey(e.target.value);
  };

  const resetError = () => {
    setError('');
  };

  const buySpot = async () => {
    resetError();

    const apiResponse = await sdk.exchange.placeOrder({
      coin: 'HYPE-SPOT',
      is_buy: true,
      sz: 1,
      limit_px: 29,
      order_type: { limit: { tif: 'Ioc' } },
      reduce_only: false,
    });

    if (apiResponse.response.data.statuses.find((status) => !!status.error)) {
      setError(JSON.stringify(apiResponse.response.data.statuses));
    }
  };
  const buyPerp = () => {};

  const updatePositionsInfo = async () => {
    setSpotBalances(await sdk.info.spot.getSpotClearinghouseState(publicKey!));
    setPerpBalances(
      await sdk.info.perpetuals.getClearinghouseState(publicKey!),
    );
  };

  const onPositionsRefresh = async () => {
    await updatePositionsInfo();
  };

  return (
    <>
      <h1>Playground</h1>
      <h4>Tokens:</h4>
      <div>Spot:</div>
      <select>
        {spot.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <div>Perps</div>
      <select>
        {perps.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <h4>Wallet</h4>
      <div>
        <div>Your private key:</div>
        <input onChange={onPrivateKeyChange} value={privateKey} />
      </div>
      {publicKey && <div>Your public key: {publicKey}</div>}
      <h4>Purchase:</h4>
      <button onClick={buySpot}>Buy spot (HYPE for $0.01)</button>
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
            {position.position.coin}
            {position.position.szi}
            {position.position.entryPx}
            {position.position.positionValue}
            {position.position.marginUsed}
            {position.position.unrealizedPnl}
          </div>
        ))}
      <button onClick={onPositionsRefresh}>Refresh</button>

      <div style={{ color: 'red' }}>{error && error}</div>
    </>
  );
}

export default App;
