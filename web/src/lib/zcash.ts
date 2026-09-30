import initWasm, { initThreadPool, UnifiedSpendingKey, WebWallet } from "@zcashcommunitygrants/webzjs-wallet";
import { lightwalletdProxies } from "./config.ts";

const NETWORK = "main";

let wasmReady: Promise<void> | null = null;
let walletPromise: Promise<WebWallet> | null = null;

export function zcashSupported(): boolean {
  return typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated;
}

function initZcash(): Promise<void> {
  wasmReady ??= (async () => {
    if (!zcashSupported()) throw new Error("This page is not cross-origin isolated, so the Zcash reader cannot start.");
    await initWasm();
    await initThreadPool(Math.max(2, Math.min(navigator.hardwareConcurrency || 4, 8)));
  })();
  return wasmReady;
}

// WebZjs allows one wallet per page, so every deal account lives in this single in-memory instance.
async function wallet(): Promise<WebWallet> {
  walletPromise ??= (async () => {
    await initZcash();
    let lastError: unknown;
    for (const proxy of lightwalletdProxies) {
      try {
        const w = new WebWallet(NETWORK, proxy, 1, 1, null);
        await w.get_latest_block();
        return w;
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`No Zcash light wallet server answered: ${String(lastError)}`);
  })();
  walletPromise.catch(() => (walletPromise = null));
  return walletPromise;
}

export interface DealAccount {
  /** ZIP 316 unified full viewing key: read-only access to this one deal. */
  ufvk: string;
  /** Unified address the terms note is sent to. */
  address: string;
  /** Chain height at creation; the reader scans only from here. */
  birthday: number;
}

/**
 * Creates the one-deal account. The seed is random, used once to derive the viewing key, then wiped:
 * nobody, including this browser, can ever spend from the deal address.
 */
export async function createDealAccount(): Promise<DealAccount> {
  const w = await wallet();
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const usk = new UnifiedSpendingKey(NETWORK, seed, 0);
  seed.fill(0);
  const fvk = usk.to_unified_full_viewing_key();
  const ufvk = fvk.encode(NETWORK);
  fvk.free();
  usk.free();

  const birthday = Number(await w.get_latest_block());
  const account = await w.create_account_view_ufvk(`deal-${birthday}`, ufvk, birthday);
  const address = await w.get_current_address(account);
  return { ufvk, address, birthday };
}

export interface DealMemo {
  txid: string;
  height: number | undefined;
  confirmations: number;
  memo: string;
}

const imported = new Map<string, number>();

/** Imports the viewing key (view-only), syncs from the birthday, and returns every text memo it can decrypt. */
export async function readDealMemos(ufvk: string, birthday: number): Promise<DealMemo[]> {
  const w = await wallet();
  let account = imported.get(ufvk);
  if (account === undefined) {
    account = await w.create_account_view_ufvk("deal", ufvk, Math.max(1, birthday - 1));
    imported.set(ufvk, account);
  }
  await w.sync();
  const history = await w.get_transaction_history(account, 100, 0);
  const entries = history.transactions as {
    txid: string;
    memo?: string;
    block_height?: number;
    confirmations: number;
  }[];
  return entries
    .filter((e) => typeof e.memo === "string" && e.memo.length > 0)
    .map((e) => ({ txid: e.txid, height: e.block_height, confirmations: e.confirmations, memo: e.memo! }));
}
