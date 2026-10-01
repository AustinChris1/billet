// Replays the sealing scan over the block that holds the zcash-delivery-proof mainnet vector, using its testnet UFVK only to prove the scan loop runs.
import { readFileSync } from "node:fs";
import { initSync, make } from "../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm.js";
import { getBlockTxids, withProxies } from "../packages/billet/src/lightwalletd.ts";

const dir = new URL("../vendor/zcash-delivery-proof/", import.meta.url);
initSync({ module: readFileSync(new URL("zcash_delivery_proof_wasm_bg.wasm", dir)) });
const v = JSON.parse(readFileSync(new URL("test-vectors/mainnet.json", dir), "utf8"));
const proxies = ["https://zcash-mainnet.chainsafe.dev", "https://zjs.zec.rocks/mainnet"];
const txids = await withProxies(proxies, (p) => getBlockTxids(p, v.height));
console.log(`block ${v.height}: ${txids.length} non-coinbase txs, vector tx present: ${txids.includes(v.txid)}`);
console.log("make() on that tx with no matching key returns:", (() => { try { return make(v.txHex, "uview1invalid"); } catch (e) { return "error: " + String(e).slice(0, 60); } })());
