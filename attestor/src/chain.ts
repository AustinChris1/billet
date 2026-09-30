import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempo, tempoModerato } from "viem/chains";
import { primageAbi } from "@primage/deal";
import type { Config } from "./config.ts";
import type { OnChainCredit } from "./rules.ts";

export type Chain = ReturnType<typeof createChain>;

export function createChain(cfg: Config) {
  const chain = cfg.chain === "tempo" ? tempo : tempoModerato;
  const transport = http(cfg.rpcUrl);
  const account = privateKeyToAccount(cfg.attestorKey);
  const pub = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ chain, transport, account });

  async function credit(id: Hex): Promise<OnChainCredit & { termsHash: Hex; supplier: Hex; buyer: Hex }> {
    const c = await pub.readContract({ address: cfg.primage, abi: primageAbi, functionName: "credit", args: [id] });
    return {
      stage: Number(c.stage),
      attestor: c.attestor,
      shipBy: Number(c.shipBy),
      arriveBy: Number(c.arriveBy),
      containerHash: c.containerHash,
      termsHash: c.termsHash,
      supplier: c.supplier,
      buyer: c.buyer,
    };
  }

  async function send(functionName: "attestLoaded" | "attestArrived" | "bindContainerBySig", args: readonly unknown[]) {
    // feeToken is Tempo's stablecoin fee field; viem's Tempo chain config serialises it.
    const hash = await wallet.writeContract({
      address: cfg.primage,
      abi: primageAbi,
      functionName,
      args: args as never,
      feeToken: cfg.feeToken,
    } as never);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${functionName} reverted in ${hash}`);
    return hash;
  }

  return {
    chainId: chain.id,
    address: account.address,
    credit,
    attest: (milestone: "loaded" | "arrived", id: Hex, eventTime: number, evidence: Hex) =>
      send(milestone === "loaded" ? "attestLoaded" : "attestArrived", [id, eventTime, evidence]),
    bindBySig: (id: Hex, containerHash: Hex, signature: Hex) => send("bindContainerBySig", [id, containerHash, signature]),
  };
}
