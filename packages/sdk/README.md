# Hyperliquid SDK for Typescript
Hyperliquid SDK is a Typescript library for building dApps on top of [Hyperliquid ecosystem](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api).

## Installation
You can install the SDK using npm:
```
npm i -S hyperliquid-sdk
```
or yarn:
```
yarn add hyperliquid-sdk
```
## Usage
```typescript
import { Hyperliquid } from 'hyperliquid-sdk';

const wallet = new ethers.Wallet(<YOUR_PRIVATE_KEY>); // or any other BaseWallet compatible

const sdk = new Hyperliquid(wallet);

await sdk.info.getAllMids();
```

## Examples
Run the CLI script for NodeJS applications, using the CLI playground (from root):
```
npm run playground-cli
```
or run the ReactJS application with the integrated SDK, using command (from root):
```
npm run playground-reactjs
```

## Contributing
The main purpose of this repository is to continue evolving Hyperliquid ecosystem, making it faster and easier to use. Contribution guides to be released soon.

## License
Hyperliquid SDK is [MIT licensed](./../../LICENSE).
