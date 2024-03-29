**:warning: The team that worked on this project has spun out of Gnosis and continues development on a forked repo (01-04-2022) which is available here <https://github.com/cowprotocol/trading-bot>**

# gp-v2-trading-bot

[![Node.js CI](https://github.com/gnosis/gp-v2-trading-bot/actions/workflows/CI.yml/badge.svg)](https://github.com/gnosis/gp-v2-trading-bot/actions/workflows/CI.yml)

*Script(s) to interact with gp-v2-contracts*

This repo can be used for educational purposes to bootstrap a programmatic integration or just serve as a playground to do random trades against the protocol.

## Usage

To install dependencies, run

```
yarn
```

To run the trade script, you need an account (in form of a mnemonic or private key) with some funds on you target network and potentially an Infura key (unless you are running on xDAI)

```
export PK=<private key with some funds>
export INFURA_KEY=<infura key> // Not needed on xDAI
```

Then run:

```
yarn hardhat trade --network <network>
```

This command will fetch a random token pair for which your account has sell balance from the token list, give approval if necessary, and place a sell order on GPv2. It will then wait for the trade to happen and return successfully if this was the case. It will fail in case there was any error along the way.

It will use a default token list for the specified network. To specify a custom  [@uniswap/token-lists](https://github.com/Uniswap/token-lists) pass in the URL using `--token-list-url`.

It will also limit trades to a maximum of 1% slippage (100 bps). To provide a custom slippage tolerance pass in `--max-slippage-bps`

## Contributing

Before submitting a PR make sure the changes comply with our linting rules.

```
yarn lint
```
