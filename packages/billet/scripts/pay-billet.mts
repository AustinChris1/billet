// Pays a billet link on Tempo Moderato from the throwaway testnet key, after opening it exactly as the browser does.
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { Abis } from "viem/tempo";
import { initSync, check } from "../../../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm.js";
import { decodeLink, openInvoice, paymentStatus, toUnits } from "../src/index.ts";

const url = process.argv[2];
if (!url) throw new Error("usage: node pay-billet.mts <billet link>");
initSync({ module: readFileSync(new URL("../../../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm_bg.wasm", import.meta.url)) });

const link = decodeLink(new URL(url).hash);
if (!link) throw new Error("not a billet link");
const sealed = await openInvoice(link, ["https://zcash-mainnet.chainsafe.dev", "https://zjs.zec.rocks/mainnet"], check);
if (sealed.invoice.chainId !== tempoModerato.id) throw new Error("this script only pays testnet invoices");
console.log("invoice:", sealed.invoice.work, sealed.invoice.amount, "USD to", sealed.invoice.payTo, "billet id", sealed.id);

const before = await paymentStatus(sealed, tempoModerato);
if (before.paid) {
  console.log("already paid:", before.payments.map((p) => p.tx));
  process.exit(0);
}

const keys: { payer: Hex } = JSON.parse(readFileSync(new URL("../../../keys/moderato.json", import.meta.url), "utf8"));
const payer = privateKeyToAccount(keys.payer);
const pub = createPublicClient({ chain: tempoModerato, transport: http() });
const wallet = createWalletClient({ account: payer, chain: tempoModerato, transport: http() });
const hash = await wallet.writeContract({
  address: sealed.invoice.token,
  abi: Abis.tip20,
  functionName: "transferWithMemo",
  args: [sealed.invoice.payTo, toUnits(sealed.invoice.amount) - before.received, sealed.id],
});
console.log("transferWithMemo", (await pub.waitForTransactionReceipt({ hash })).status, hash);
const after = await paymentStatus(sealed, tempoModerato);
console.log(after.paid ? "PAID" : "still unpaid", `${after.received} of ${after.due}`);
