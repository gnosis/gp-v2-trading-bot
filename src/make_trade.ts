import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { TokenInfo, TokenList } from "@uniswap/token-lists";
import { BigNumber, Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fetch from "node-fetch";

async function makeTrade(
  tokenListUrl: string,
  { ethers }: HardhatRuntimeEnvironment
): Promise<void> {
  const [trader] = await ethers.getSigners();

  const all_tokens = (await fetchTokenList(tokenListUrl)).tokens;
  const tokens_with_balance = await tokensWithBalance(
    all_tokens,
    trader,
    ethers
  );

  const { token: sell_token, balance: sell_balance } = selectRandom(
    tokens_with_balance
  );
  const buy_token = selectRandom(
    all_tokens.filter((token) => sell_token !== token)
  );

  console.log(
    `Selling ${sell_balance.toString()} of ${sell_token.name} for ${
      buy_token.name
    }`
  );
}

async function fetchTokenList(tokenListUrl: string): Promise<TokenList> {
  const response = await fetch(tokenListUrl);
  return await response.json();
}

function selectRandom<T>(list: T[]): T {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

interface TokenAndBalance {
  token: TokenInfo;
  balance: BigNumber;
}

async function tokensWithBalance(
  all_tokens: TokenInfo[],
  trader: SignerWithAddress,
  ethers: HardhatEthersHelpers
): Promise<TokenAndBalance[]> {
  return (
    await Promise.all(
      all_tokens.map(async (token) => {
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

export { makeTrade };
