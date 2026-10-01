// Pays a Billet invoice on Tempo Moderato with transferWithMemo, then finds the payment the way the billet page does.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { Abis } from "viem/tempo";
import { billetId, decodeInvoice, encodeInvoice, newNonce, paymentStatus, toUnits, type SealedInvoice } from "../src/index.ts";

const OUSD = "0x20c0000000000000000000006a37da5c996874be";
const keyFile = new URL("../../../keys/moderato.json", import.meta.url);
mkdirSync(new URL("../../../keys/", import.meta.url), { recursive: true });
const keys: { payer: Hex; payee: Hex } = existsSync(keyFile)
  ? JSON.parse(readFileSync(keyFile, "utf8"))
  : { payer: generatePrivateKey(), payee: generatePrivateKey() };
writeFileSync(keyFile, JSON.stringify(keys, null, 2));

const payer = privateKeyToAccount(keys.payer);
const payee = privateKeyToAccount(keys.payee);
const pub = createPublicClient({ chain: tempoModerato, transport: http() });
const wallet = createWalletClient({ account: payer, chain: tempoModerato, transport: http() });

const bal = (a: Hex) => pub.readContract({ address: OUSD, abi: Abis.tip20, functionName: "balanceOf", args: [a] });
if ((await bal(payer.address)) < 100_000_000n) {
  await pub.request({ method: "tempo_fundAddress" as never, params: [payer.address] as never });
  await new Promise((r) => setTimeout(r, 4000));
}
console.log("payer OUSD", (await bal(payer.address)).toString());

const memo = encodeInvoice({
  from: "Ada Okafor",
  to: "Jonas Weber",
  work: "Logo design, October",
  amount: "12.5",
  chainId: tempoModerato.id,
  token: OUSD,
  payTo: payee.address,
  due: "2026-10-20",
  since: Number(await pub.getBlockNumber()),
  nonce: newNonce(),
});
const id = billetId(memo);
const sealed = { invoice: decodeInvoice(memo), memoText: memo, id } as SealedInvoice;
const from = await pub.getBlockNumber();

const before = await paymentStatus(sealed, tempoModerato, from);
console.log("before:", before.paid ? "PAID" : "unpaid", before.received);

const hash = await wallet.writeContract({
  address: OUSD,
  abi: Abis.tip20,
  functionName: "transferWithMemo",
  args: [payee.address, toUnits("12.5"), id],
});
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log("transferWithMemo", receipt.status, hash);

const after = await paymentStatus(sealed, tempoModerato, from);
console.log("after:", after.paid ? "PAID" : "unpaid", `${after.received} of ${after.due}`, after.payments.map((p) => p.tx));

const other = { ...sealed, id: billetId(memo + " ") } as SealedInvoice;
console.log("a different billet id sees:", (await paymentStatus(other, tempoModerato, from)).received);
