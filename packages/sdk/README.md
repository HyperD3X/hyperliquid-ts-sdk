# Typescript SDK for the Hyperliquid DEX with the working examples

### How to use:
```
import { Hyperliquid } from 'hyperliquid-sdk';

const rawMode = true;
const privateKey = <YOUR_PRIVATE_KEY>; 

const sdk = new Hyperliquid(privateKey);

await sdk.info.getAllMids(rawMode)
```
