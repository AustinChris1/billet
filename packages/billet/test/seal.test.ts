import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initSync, check, make } from "../../../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm.js";
import { sealFromTxid, watchForSeal, type ChainReader } from "../src/index.ts";

const vendor = new URL("../../../vendor/zcash-delivery-proof/", import.meta.url);
initSync({ module: readFileSync(new URL("zcash_delivery_proof_wasm_bg.wasm", vendor)) });
const vector = (name: string) => JSON.parse(readFileSync(new URL(`test-vectors/${name}.json`, vendor), "utf8"));

// A real mined testnet transaction paying an Ironwood note with a memo, plus the viewing key that sees it.
const testnet = vector("testnet");
// A real mainnet transaction this key cannot see: the decoy in the same block.
const mainnet = vector("mainnet");
const memoText: string = JSON.parse(make(testnet.txHex, testnet.ufvk))[0].memoText;

function reader(blocks: Record<number, string[]>, tip: number): ChainReader & { asked: number[] } {
  const txs: Record<string, string> = { [testnet.txid]: testnet.txHex, [mainnet.txid]: mainnet.txHex };
  const asked: number[] = [];
  return {
    asked,
    latestHeight: async () => tip,
    blockTxids: async (h) => (asked.push(h), blocks[h] ?? []),
    transaction: async (id) => ({ txHex: txs[id]!, height: testnet.height }),
  };
}

test("the watcher skips empty blocks and decoys, and returns a proof that verifies", async () => {
  const h = testnet.height as number;
  const r = reader({ [h]: [mainnet.txid, testnet.txid] }, h);
  const seen: number[] = [];
  const sealed = await watchForSeal({ make, viewingKey: testnet.ufvk, memoText, fromHeight: h - 2, reader: r, onHeight: (s) => seen.push(s) });

  assert.equal(sealed.txid, testnet.txid);
  assert.equal(sealed.height, h);
  assert.deepEqual(r.asked, [h - 2, h - 1, h]);
  assert.deepEqual(seen, [h - 2, h - 1]);
  const delivery = JSON.parse(check(testnet.txHex, sealed.proof, "testnet"));
  assert.equal(delivery.memoText, memoText);
});

test("pasting the txid proves the same note without scanning", async () => {
  const r = reader({}, 0);
  const sealed = await sealFromTxid({ make, viewingKey: testnet.ufvk, memoText, txid: testnet.txid.toUpperCase(), reader: r });
  assert.equal(sealed.txid, testnet.txid);
  assert.deepEqual(r.asked, [], "no block scan");
  assert.equal(JSON.parse(check(testnet.txHex, sealed.proof, "testnet")).memoText, memoText);
});

test("a transaction that does not carry this exact invoice is refused", async () => {
  const r = reader({}, 0);
  await assert.rejects(
    sealFromTxid({ make, viewingKey: testnet.ufvk, memoText: memoText + " edited", txid: testnet.txid, reader: r }),
    /does not carry this invoice/,
  );
  await assert.rejects(sealFromTxid({ make, viewingKey: testnet.ufvk, memoText, txid: mainnet.txid, reader: r }), /does not carry/);
  await assert.rejects(sealFromTxid({ make, viewingKey: testnet.ufvk, memoText, txid: "abc", reader: r }), /64 hex/);
});

test("the watcher stops when its signal aborts", async () => {
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(
    watchForSeal({ make, viewingKey: testnet.ufvk, memoText, fromHeight: 1, reader: reader({}, 0), signal: ctl.signal }),
    (e: Error) => e.name === "AbortError",
  );
});
