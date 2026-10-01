import { getBlockTxids, getLatestHeight, getTransaction, withProxies, type RawTransaction } from "./lightwalletd.ts";
import type { BilletLink } from "./link.ts";

/** zcash-delivery-proof's make(txHex, viewingKey): JSON array of the notes that key can see, each with its proof. */
export type MakeFn = (txHex: string, viewingKey: string) => string;

/** The three chain reads sealing needs. Defaults to the public gRPC-web proxies; tests pass recorded transactions. */
export interface ChainReader {
  latestHeight(): Promise<number>;
  blockTxids(height: number): Promise<string[]>;
  transaction(txid: string): Promise<RawTransaction>;
}

export function proxyReader(proxies: string[]): ChainReader {
  return {
    latestHeight: () => withProxies(proxies, getLatestHeight),
    blockTxids: (h) => withProxies(proxies, (p) => getBlockTxids(p, h)),
    transaction: (id) => withProxies(proxies, (p) => getTransaction(p, id)),
  };
}

interface Found {
  proof: string;
  side: string;
  memoText: string;
}

const clean = (m: string) => m.replace(/\0+$/, "");

/** The received note in this transaction whose memo is exactly the invoice, if the viewing key can see one. */
function findInvoiceNote(make: MakeFn, txHex: string, viewingKey: string, memoText: string): Found | undefined {
  let found: Found[];
  try {
    found = JSON.parse(make(txHex, viewingKey)) as Found[];
  } catch {
    return undefined;
  }
  const target = clean(memoText);
  return found.find((f) => f.side === "received" && clean(f.memoText) === target);
}

export interface SealOptions {
  make: MakeFn;
  viewingKey: string;
  memoText: string;
  proxies?: string[];
  reader?: ChainReader;
}

export interface WatchOptions extends SealOptions {
  /** First block to scan; the height when the payment request was shown. */
  fromHeight: number;
  signal?: AbortSignal;
  pollMs?: number;
  onHeight?: (scanned: number, tip: number) => void;
}

const readerOf = (o: SealOptions) => o.reader ?? proxyReader(o.proxies ?? []);

/** For a txid the issuer already has from their wallet: proves that transaction carries the invoice note, without scanning. */
export async function sealFromTxid(o: SealOptions & { txid: string }): Promise<BilletLink & { height: number }> {
  const txid = o.txid.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(txid)) throw new Error("A Zcash transaction id is 64 hex characters.");
  const tx = await readerOf(o).transaction(txid);
  const hit = findInvoiceNote(o.make, tx.txHex, o.viewingKey, o.memoText);
  if (!hit) throw new Error("That transaction does not carry this invoice to your sealing address.");
  return { proof: hit.proof, txid, height: tx.height };
}

/** Scans new blocks until a note to the viewing key carries exactly this memo, then returns its delivery proof. */
export async function watchForSeal(o: WatchOptions): Promise<BilletLink & { height: number }> {
  const reader = readerOf(o);
  let next = o.fromHeight;
  const seen = new Set<string>();
  for (;;) {
    if (o.signal?.aborted) throw new DOMException("stopped", "AbortError");
    const tip = await reader.latestHeight();
    while (next <= tip) {
      for (const txid of await reader.blockTxids(next)) {
        if (seen.has(txid)) continue;
        seen.add(txid);
        const tx = await reader.transaction(txid);
        const hit = findInvoiceNote(o.make, tx.txHex, o.viewingKey, o.memoText);
        if (hit) return { proof: hit.proof, txid, height: next };
      }
      o.onHeight?.(next, tip);
      next++;
    }
    await new Promise((r) => setTimeout(r, o.pollMs ?? 15_000));
  }
}
