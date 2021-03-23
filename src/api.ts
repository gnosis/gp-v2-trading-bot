import { BigNumber } from "@ethersproject/bignumber";
import { Order, OrderKind } from "@gnosis.pm/gp-v2-contracts";
import fetch, { RequestInit } from "node-fetch";

export class Api {
  network: string;

  constructor(network: string) {
    this.network = network;
  }

  async call<T>(route: string, init?: RequestInit): Promise<T> {
    const url = `https://protocol-${this.network}.dev.gnosisdev.com/api/v1/${route}`;
    const response = await fetch(url, init);
    const body = await response.json();
    if (Math.floor(response.status / 100) !== 2) {
      throw `Calling "${url} ${JSON.stringify(init)} failed with ${
        response.status
      }: ${JSON.stringify(body)}`;
    }
    return body;
  }

  async getFee(
    selToken: string,
    buyToken: string,
    amount: BigNumber,
    kind: OrderKind
  ): Promise<BigNumber> {
    const response: GetFeeResponse = await this.call(
      `fee?sellToken=${selToken}&buyToken=${buyToken}&amount=${amount}&kind=${kind}`
    );
    return BigNumber.from(response.amount);
  }

  async estimateTradeAmount(
    selToken: string,
    buyToken: string,
    amount: BigNumber,
    kind: OrderKind
  ): Promise<BigNumber> {
    const response: EstimateAmountResponse = await this.call(
      `markets/${selToken}-${buyToken}/${kind}/${amount}`
    );
    return BigNumber.from(response.amount);
  }

  async placeOrder(order: Order, signature: string): Promise<string> {
    return await this.call("orders", {
      method: "post",
      body: JSON.stringify({
        sellToken: order.sellToken,
        buyToken: order.buyToken,
        sellAmount: order.sellAmount.toString(),
        buyAmount: order.buyAmount.toString(),
        validTo: order.validTo,
        appData: order.appData,
        feeAmount: order.feeAmount.toString(),
        kind: order.kind,
        partiallyFillable: order.partiallyFillable,
        signature,
      }),
      headers: { "Content-Type": "application/json" },
    });
  }
}

interface GetFeeResponse {
  amount: string;
  expirationDate: Date;
}

interface EstimateAmountResponse {
  amount: string;
  token: string;
}
