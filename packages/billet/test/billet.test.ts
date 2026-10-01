import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initSync, check, make } from "../../../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm.js";
import {
  billetId,
  byteLength,
  decodeInvoice,
  decodeLink,
  encodeInvoice,
  encodeLink,
  InvoiceError,
  MEMO_MAX_BYTES,
  toUnits,
  type Invoice,
} from "../src/index.ts";

initSync({ module: readFileSync(new URL("../../../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm_bg.wasm", import.meta.url)) });

const inv: Invoice = {
  from: "Ada Okafor",
  to: "Jonas Weber",
  work: "Logo design, October",
  amount: "400",
  chainId: 4217,
  token: "0x20c0000000000000000000000000000000000000",
  payTo: "0x7adba972c518d8a489c4c1ba40c310cb8578894c",
  due: "2026-10-20",
  since: 42082271,
  nonce: "0123456789abcdef",
};

test("invoice round-trips and stays under the memo limit", () => {
  const memo = encodeInvoice(inv);
  assert.ok(byteLength(memo) <= MEMO_MAX_BYTES);
  const back = decodeInvoice(memo);
  assert.equal(back.work, "Logo design, October");
  assert.equal(back.payTo.toLowerCase(), inv.payTo);
  assert.equal(encodeInvoice(back), memo);
});

test("billet id is stable, ignores memo zero padding, and changes with any edit", () => {
  const memo = encodeInvoice(inv);
  assert.equal(billetId(memo), billetId(memo + "\0\0"));
  assert.notEqual(billetId(memo), billetId(encodeInvoice({ ...inv, amount: "401" })));
  assert.notEqual(billetId(memo), billetId(encodeInvoice({ ...inv, nonce: "fedcba9876543210" })));
});

test("edited, reordered or non-canonical text is refused", () => {
  const memo = encodeInvoice(inv);
  // An edited name still decodes; the billet id is what catches it, because the Tempo memo no longer matches.
  assert.notEqual(billetId(memo.replace("from=Ada", "from=Eve")), billetId(memo));
  assert.throws(() => decodeInvoice(memo.replace("amount=400 USD", "amount=400.0 USD")), InvoiceError);
  assert.throws(() => decodeInvoice(memo.replace("BILLET/1", "BILLET/2")), InvoiceError);
  assert.throws(() => decodeInvoice(memo.split("\n").reverse().join("\n")), InvoiceError);
});

test("bad inputs are caught before they reach a wallet", () => {
  assert.throws(() => encodeInvoice({ ...inv, amount: "-5" }), InvoiceError);
  assert.throws(() => encodeInvoice({ ...inv, amount: "1.1234567" }), InvoiceError);
  assert.throws(() => encodeInvoice({ ...inv, due: "20/10/2026" }), InvoiceError);
  assert.throws(() => encodeInvoice({ ...inv, work: "x".repeat(161) }), InvoiceError);
  assert.throws(() => encodeInvoice({ ...inv, since: -1 }), InvoiceError);
  assert.equal(encodeInvoice({ ...inv, work: "  Logo\n design  " }).includes("for=Logo design"), true);
});

test("amounts convert to 6-decimal TIP-20 units", () => {
  assert.equal(toUnits("400"), 400_000_000n);
  assert.equal(toUnits("0.5"), 500_000n);
  assert.equal(toUnits("12.000001"), 12_000_001n);
});

test("links carry a proof and a txid, never a key", () => {
  const link = { proof: "zdp:1:WXvYf_frFEgV", txid: "6ef95d7ee48af136d33196e510712b916a6d15498f75c1154814ebf77fd87b59" };
  assert.deepEqual(decodeLink(encodeLink(link)), link);
  assert.equal(decodeLink("#k=uview1abc&t=6ef9"), null);
});

test("the delivery-proof library authenticates the memo text Billet hashes", () => {
  const v = JSON.parse(readFileSync(new URL("../../../vendor/zcash-delivery-proof/test-vectors/mainnet.json", import.meta.url), "utf8"));
  const d = JSON.parse(check(v.txHex, v.proof, "mainnet"));
  assert.equal(d.memoText, "zcash-delivery-proof test vector");
  assert.throws(() => decodeInvoice(d.memoText), InvoiceError, "a non-Billet note is not an invoice");
  assert.equal(typeof make, "function");
});

test("an invoice can accept any listed USD stablecoin", async () => {
  const { acceptedTokens, stablecoins, symbolOf } = await import("../src/index.ts");
  const memo = encodeInvoice({ ...inv, token: "USD" });
  assert.match(memo, /\ntoken=USD\n/);
  assert.equal(decodeInvoice(memo).token, "USD");
  assert.notEqual(billetId(memo), billetId(encodeInvoice(inv)), "accepting any token is a different invoice");
  assert.deepEqual(acceptedTokens(4217, "USD").map((t) => t.symbol), ["OUSD", "USDT0", "USDC.e", "pathUSD"]);
  assert.equal(acceptedTokens(4217, inv.token).length, 1);
  assert.equal(stablecoins(42431).length, 5);
  assert.equal(symbolOf(42431, "0x20C0000000000000000000000000000000000001"), "AlphaUSD");
  assert.throws(() => decodeInvoice(memo.replace("token=USD", "token=EUR")), InvoiceError);
});
