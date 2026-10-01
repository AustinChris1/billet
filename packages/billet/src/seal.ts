import { getBlockTxids, getLatestHeight, getTransaction, withProxies } from "./lightwalletd.ts";
import type { BilletLink } from "./link.ts";

/** zcash-delivery-proof's make(txHex, viewingKey): JSON array of the notes that key can see, each with its proof. */
export type MakeFn = (txHex: string, viewingKey: string) => string;

interface Found {
  proof: string;
  side: string;
  memoText: string;
}

export interface WatchOptions {
  proxies: string[];
  make: MakeFn;
  viewingKey: string;
  memoText: string;
  /** First block to scan; the height when the payment request was shown. */
  fromHeight: number;
  signal?: AbortSignal;
  pollMs?: number;
  onHeight?: (scanned: number, tip: number) => void;
}

/** Scans new blocks until a note to the viewing key carries exactly this memo, then returns its delivery proof. */
export async function watchForSeal(o: WatchOptions): Promise<BilletLink & { height: number }> {
  const target = o.memoText.replace(/\0+$/, "");
  let next = o.fromHeight;
  const seen = new Set<string>();
  for (;;) {
    if (o.signal?.aborted) throw new DOMException("stopped", "AbortError");
    const tip = await withProxies(o.proxies, getLatestHeight);
    while (next <= tip) {
      const txids = await withProxies(o.proxies, (p) => getBlockTxids(p, next));
      for (const txid of txids) {
        if (seen.has(txid)) continue;
        seen.add(txid);
        const tx = await withProxies(o.proxies, (p) => getTransaction(p, txid));
        let found: Found[] = [];
        try {
          found = JSON.parse(o.make(tx.txHex, o.viewingKey)) as Found[];
        } catch {
          continue;
        }
        const hit = found.find((f) => f.side === "received" && f.memoText.replace(/\0+$/, "") === target);
        if (hit) return { proof: hit.proof, txid, height: next };
      }
      o.onHeight?.(next, tip);
      next++;
    }
    await new Promise((r) => setTimeout(r, o.pollMs ?? 15_000));
  }
}
