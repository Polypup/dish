# Web3 Token Burner

A Vue 3 application that allows users to connect their Web3 wallets using Blocknative's Web3-Onboard and burn ERC20 tokens with a burn function.

## Features

- Connect to Web3 wallets (MetaMask, WalletConnect, etc.) using Blocknative's Web3-Onboard
- Interact with Ethereum/EVM tokens using ethers.js v6
- Burn tokens by entering an amount and submitting
- Support for any ERC20 token with a burn function
- Responsive UI designed with Vue 3

## Prerequisites

- Node.js (v16+)
- NPM or Yarn
- A Web3 wallet (MetaMask, WalletConnect, etc.)

## Installation

1. Install dependencies:
   ```sh
   npm install
   ```

2. Run the development server:
   ```sh
   npm run dev
   ```

3. Build for production:
   ```sh
   npm run build
   ```

## Usage

1. Connect your wallet using the "Connect Wallet" button
2. Enter the token address you want to interact with
3. Enter the amount of tokens you want to burn
4. Click "Burn Tokens" to execute the transaction

## Technologies Used

- Vue 3 - Progressive JavaScript Framework
- Vite - Next Generation Frontend Tooling
- Web3-Onboard by Blocknative - Wallet connection library
- ethers.js v6 - Complete Ethereum library

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).