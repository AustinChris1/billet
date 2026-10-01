import { getLatestHeight, withProxies } from "@billet/core";

type WebZjs = typeof import("@zcashcommunitygrants/webzjs-wallet");
const WEBZJS_URL = "/webzjs/webzjs_wallet.js";
import { lightwalletdProxies } from "./config.ts";

const NETWORK = "main";
const STORE = "billet.issuer.v1";

export interface Issuer {
  /** Unified full viewing key: lets this browser find and prove its own sealed notes. Never leaves the device. */
  ufvk: string;
  /** The receive-only address invoices are sealed to. */
  address: string;
  createdAt: string;
}

export function zcashSupported(): boolean {
  return typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated;
}

export function loadIssuer(): Issuer | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Issuer) : null;
  } catch {
    return null;
  }
}

export function forgetIssuer() {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* storage blocked */
  }
}

let wasm: Promise<WebZjs> | null = null;

/**
 * Creates the sealing address. The seed is random, used once to derive the viewing key, then wiped:
 * nobody, including this browser, can ever spend from it, so the sealing dust is burned by design.
 */
export async function createIssuer(): Promise<Issuer> {
  if (!zcashSupported()) throw new Error("This page is not cross-origin isolated, so the Zcash key library cannot start.");
  wasm ??= (async () => {
    // A runtime URL keeps Vite from rewriting this import, so the browser loads the static module as-is.
    const mod = (await import(/* @vite-ignore */ new URL(WEBZJS_URL, window.location.origin).href)) as WebZjs;
    await mod.default();
    await mod.initThreadPool(Math.max(2, Math.min(navigator.hardwareConcurrency || 4, 8)));
    return mod;
  })();
  const { UnifiedSpendingKey, WebWallet } = await wasm;

  const seed = crypto.getRandomValues(new Uint8Array(32));
  const usk = new UnifiedSpendingKey(NETWORK, seed, 0);
  seed.fill(0);
  const fvk = usk.to_unified_full_viewing_key();
  const ufvk = fvk.encode(NETWORK);
  fvk.free();
  usk.free();

  let lastError: unknown;
  for (const proxy of lightwalletdProxies) {
    try {
      const wallet = new WebWallet(NETWORK, proxy, 1, 1, null);
      const birthday = await withProxies([proxy], getLatestHeight);
      const account = await wallet.create_account_view_ufvk("billet", ufvk, birthday);
      const address = await wallet.get_current_address(account);
      wallet.free();
      const issuer = { ufvk, address, createdAt: new Date().toISOString() };
      try {
        localStorage.setItem(STORE, JSON.stringify(issuer));
      } catch {
        /* storage blocked: the issuer lives for this session only */
      }
      return issuer;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`No Zcash light wallet server answered: ${String(lastError)}`);
}
