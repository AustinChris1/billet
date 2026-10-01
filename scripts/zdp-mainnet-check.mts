// Fetches a real mainnet transaction over gRPC-web and checks a delivery proof against it, as the browser will.
import { readFileSync } from "node:fs";
import { initSync, check } from "../vendor/zcash-delivery-proof/zcash_delivery_proof_wasm.js";
import { getLatestHeight, getTransaction, withProxies } from "../packages/deal/src/lightwalletd.ts";

const dir = new URL("../vendor/zcash-delivery-proof/", import.meta.url);
initSync({ module: readFileSync(new URL("zcash_delivery_proof_wasm_bg.wasm", dir)) });
const v = JSON.parse(readFileSync(new URL("test-vectors/mainnet.json", dir), "utf8"));
const proxies = ["https://zcash-mainnet.chainsafe.dev", "https://zjs.zec.rocks/mainnet"];

for (const p of proxies) console.log("tip", p, await getLatestHeight(p));
const tx = await withProxies(proxies, (p) => getTransaction(p, v.txid));
console.log("fetched at height", tx.height, "bytes match vector:", tx.txHex === v.txHex);
console.log("check:", check(tx.txHex, v.proof, "mainnet"));
try {
  check(tx.txHex, v.proof.slice(0, -2) + "AA", "mainnet");
  console.log("tampered proof ACCEPTED");
} catch (e) {
  console.log("tampered proof rejected:", String(e).slice(0, 100));
}
