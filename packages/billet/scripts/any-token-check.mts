// A "token=USD" invoice paid in AlphaUSD (not OUSD) on Moderato must read as paid; a pinned-OUSD invoice paid in AlphaUSD must not.
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { Abis } from "viem/tempo";
import { billetId, decodeInvoice, encodeInvoice, newNonce, paymentStatus, toUnits, type SealedInvoice } from "../src/index.ts";

const ALPHA = "0x20c0000000000000000000000000000000000001";
const keys: { payer: Hex; payee: Hex } = JSON.parse(readFileSync(new URL("../../../keys/moderato.json", import.meta.url), "utf8"));
const payer = privateKeyToAccount(keys.payer);
const payee = privateKeyToAccount(keys.payee).address;
const pub = createPublicClient({ chain: tempoModerato, transport: http() });
const wallet = createWalletClient({ account: payer, chain: tempoModerato, transport: http() });
const since = Number(await pub.getBlockNumber());

const make = (token: `0x${string}` | "USD") => {
  const memo = encodeInvoice({ from: "Ada", to: "Jonas", work: "Logo", amount: "3", chainId: tempoModerato.id, token, payTo: payee, due: "2026-10-20", since, nonce: newNonce() });
  return { invoice: decodeInvoice(memo), memoText: memo, id: billetId(memo) } as SealedInvoice;
};
const anyUsd = make("USD");
const pinned = make("0x20c0000000000000000000006a37da5c996874be");

for (const s of [anyUsd, pinned]) {
  const hash = await wallet.writeContract({ address: ALPHA, abi: Abis.tip20, functionName: "transferWithMemo", args: [payee, toUnits("3"), s.id] });
  await pub.waitForTransactionReceipt({ hash });
}
const a = await paymentStatus(anyUsd, tempoModerato);
const p = await paymentStatus(pinned, tempoModerato);
console.log("token=USD paid in AlphaUSD:", a.paid ? "PAID" : "unpaid", a.payments.map((x) => x.token));
console.log("token=OUSD paid in AlphaUSD:", p.paid ? "PAID (wrong)" : "unpaid (correct)");
