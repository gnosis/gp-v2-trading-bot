import {
  OrderKind,
  Order,
  signOrder,
  SigningScheme,
  domain,
} from "@gnosis.pm/gp-v2-contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { TokenInfo, TokenList } from "@uniswap/token-lists";
import { BigNumber, Contract, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fetch from "node-fetch";

import { Api } from "./api";

export async function makeTrade(
  tokenListUrl: string,
  { ethers, network }: HardhatRuntimeEnvironment
): Promise<void> {
  const [trader] = await ethers.getSigners();
  if (!network.config.chainId) {
    throw "Network doesn't expose a chainId";
  }

  const allTokens = await fetchTokenList(tokenListUrl, network.config.chainId);
  const tokensWithBalance = await filterTokensWithBalance(
    allTokens,
    trader,
    ethers
  );
  if (tokensWithBalance.length === 0) {
    throw "Account doesn't have any balance in any of the provided token";
  }

  const { token: sellToken, balance: sellBalance } = selectRandom(
    tokensWithBalance
  );
  const buyToken = selectRandom(
    allTokens.filter((token) => sellToken !== token)
  );

  const api = new Api(network.name);
  const fee = await api.getFee(
    sellToken.address,
    buyToken.address,
    sellBalance,
    OrderKind.SELL
  );

  if (sellBalance.lte(fee)) {
    throw "Account doesn't have enough balance to pay fee";
  }

  const sellAmountAfterFee = sellBalance.sub(fee);
  const buyAmount = await api.estimateTradeAmount(
    sellToken.address,
    buyToken.address,
    sellAmountAfterFee,
    OrderKind.SELL
  );

  console.log(
    `Selling ${sellAmountAfterFee.toString()} of ${
      sellToken.name
    } for ${buyAmount} of ${buyToken.name} with a ${fee.toString()} fee`
  );

  const order = createOrder(
    sellToken,
    buyToken,
    sellAmountAfterFee,
    buyAmount,
    fee
  );
  const signature = await signOrder(
    domain(
      network.config.chainId,
      // TODO: How do I get this address from the repo?
      "0x4E608b7Da83f8E9213F554BDAA77C72e125529d0"
    ),
    order,
    trader,
    // TODO: TypedData does not seem to work with the ethers provider
    SigningScheme.MESSAGE
  );

  const uid = await api.placeOrder(order, signature);
  console.log(`Successfully placed order with uid: ${uid}`);
}

async function fetchTokenList(
  tokenListUrl: string,
  chainId: number
): Promise<TokenInfo[]> {
  const response = await fetch(tokenListUrl);
  const list: TokenList = await response.json();
  return list.tokens.filter((token) => token.chainId === chainId);
}

function selectRandom<T>(list: T[]): T {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

interface TokenAndBalance {
  token: TokenInfo;
  balance: BigNumber;
}

async function filterTokensWithBalance(
  allTokens: TokenInfo[],
  trader: SignerWithAddress,
  ethers: HardhatEthersHelpers
): Promise<TokenAndBalance[]> {
  return (
    await Promise.all(
      allTokens.map(async (token) => {
        const erc20 = await toERC20(token.address, ethers);
        const balance: BigNumber = await erc20.balanceOf(trader.address);
        return {
          token,
          balance,
        };
      })
    )
  ).filter((tokenAndBalance) => {
    return !tokenAndBalance.balance.isZero();
  });
}

async function toERC20(
  address: string,
  ethers: HardhatEthersHelpers
): Promise<Contract> {
  return new Contract(address, ERC20.abi, ethers.provider);
}

// Using the most significant 4 bytes of a unique phrase's hash. TODO: use full hash after SC upgrade.
const APP_DATA = parseInt(
  ethers.utils.hexDataSlice(keccak("GPv2 Trading Bot"), 0, 4)
);

function keccak(message: string) {
  const utf8Encoder = new TextEncoder();
  return ethers.utils.keccak256(utf8Encoder.encode(message));
}

function createOrder(
  sellToken: TokenInfo,
  buyToken: TokenInfo,
  sellAmountAfterFee: BigNumber,
  buyAmount: BigNumber,
  fee: BigNumber
): Order {
  // getTime returns milliseconds, we are looking for seconds
  const now = Math.floor(new Date().getTime() / 1000);
  return {
    sellToken: sellToken.address,
    buyToken: buyToken.address,
    sellAmount: sellAmountAfterFee,
    // add 0.5 % slippage
    buyAmount: buyAmount.mul(995).div(1000),
    // valid 15 minutes
    validTo: now + 900,
    appData: APP_DATA,
    feeAmount: fee,
    kind: OrderKind.SELL,
    partiallyFillable: false,
  };
}
