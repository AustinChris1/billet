import init, { check, make } from "zcash-delivery-proof-wasm";

let ready: Promise<unknown> | null = null;

/** Loads zcash-delivery-proof's 800 KB WebAssembly once; it does no I/O of its own. */
export async function proofLib() {
  ready ??= init();
  await ready;
  return { check, make };
}
