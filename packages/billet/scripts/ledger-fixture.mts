// Writes two real Moderato invoices, pays one with transferWithMemo, and prints them as "Your billets" entries.
import { existsSync, readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { Abis } from "viem/tempo";
import { billetId, encodeInvoice, newNonce, toUnits } from "../src/index.ts";

const OUSD = "0x20c0000000000000000000006a37da5c996874be";
const keyFile = new URL("../../../keys/moderato.json", import.meta.url);
if (!existsSync(keyFile)) throw new Error("run scripts/tempo-pay-check.mts once first to create keys/moderato.json");
const keys: { payer: Hex; payee: Hex } = JSON.parse(readFileSync(keyFile, "utf8"));
const payer = privateKeyToAccount(keys.payer);
const payee = privateKeyToAccount(keys.payee);
const pub = createPublicClient({ chain: tempoModerato, transport: http() });
const wallet = createWalletClient({ account: payer, chain: tempoModerato, transport: http() });
const since = Number(await pub.getBlockNumber());

const invoice = (to: string, work: string, amount: string) =>
  encodeInvoice({ from: "Ada Okafor", to, work, amount, chainId: tempoModerato.id, token: OUSD, payTo: payee.address, due: "2026-10-20", since, nonce: newNonce() });

const paidMemo = invoice("Jonas Weber", "Logo design, October", "400");
const openMemo = invoice("Studio Nord", "Brand guidelines, first draft", "1250");

const hash = await wallet.writeContract({ address: OUSD, abi: Abis.tip20, functionName: "transferWithMemo", args: [payee.address, toUnits("400"), billetId(paidMemo)] });
await pub.waitForTransactionReceipt({ hash });

const fake = (n: number) => `/b#t=${"0".repeat(63)}${n}&p=zdp:1:fixture`;
console.log(
  JSON.stringify([
    { url: fake(1), memo: paidMemo, at: new Date().toISOString() },
    { url: fake(2), memo: openMemo, at: new Date().toISOString() },
  ]),
);
console.error("paid with", hash);
