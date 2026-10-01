# Pip Token ($PIP)

A fixed-supply ERC-20 token for Avalanche C-Chain, with an on-chain vesting
contract for the team allocation.

> "Pip Token" / "PIP" and the numbers in `token.config.js` are placeholders.
> Change them before you deploy. Name, symbol and supply cannot be changed after deployment.

## What the contract does

- **Fixed supply.** All tokens are minted once at deployment. There is no mint function.
- **No admin keys.** No owner, pause, blacklist, transfer tax or upgrade proxy. Nobody,
  including you, can change balances or rules after deployment. Buyers and token
  scanners look for exactly this.
- **Burnable.** Holders can burn their own tokens.
- **Permit (EIP-2612).** Supports gasless approvals, which DEXes and wallets use.
- **Team vesting.** `TeamVesting` holds the team share: nothing before the cliff
  (12 months by default), then linear unlocks until month 36.

Built on [OpenZeppelin Contracts](https://www.openzeppelin.com/contracts) 5.x.

## Setup

```bash
npm install
npm test        # runs the test suite on a local chain
```

## Configure

1. Edit `token.config.js`: name, symbol, total supply, allocation and vesting.
2. `cp .env.example .env` and fill in:
   - `DEPLOYER_PRIVATE_KEY`: a fresh wallet used only for deploying
   - `TREASURY_ADDRESS`: a multisig such as [Safe](https://app.safe.global) on Avalanche
   - `TEAM_BENEFICIARY`: the wallet that receives vested team tokens

## Deploy

**1. Test on Fuji (free testnet AVAX).** Get test AVAX from the
[Avalanche faucet](https://core.app/tools/testnet-faucet/), then:

```bash
npm run deploy:fuji
npm run verify:fuji   # publishes the source code on testnet.snowtrace.io
```

Check the token on [testnet.snowtrace.io](https://testnet.snowtrace.io), add it to a
wallet and try a transfer.

**2. Deploy to Avalanche mainnet** once you're happy. You need a small amount of real AVAX
for gas.

```bash
npm run deploy:mainnet
npm run verify:mainnet
```

Addresses and constructor arguments are saved to `deployments/<network>.json`.

## After deploying

1. **Add liquidity** on an Avalanche DEX (e.g. LFJ / Trader Joe or Pharaoh), pairing the
   liquidity bucket with AVAX or USDC.
2. **Lock the LP tokens** with a locker service, so buyers can see liquidity can't be pulled.
3. **Get an audit** before you put real money in. The contract is small and uses
   standard OpenZeppelin code, but an independent review is what investors look for.
4. **Publish the contract address** on the website and your official channels.

## Before you launch

Selling a token to the public can count as a securities offering in many countries
(for example under US, UK and EU rules). Marketing that promises returns makes this
more likely. Talk to a lawyer about where you can sell it and what you can say.
