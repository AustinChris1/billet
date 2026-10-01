// The link fragment never reaches a server. It carries a delivery proof, not a key: it opens one note and nothing else.
export interface BilletLink {
  /** zdp:1: delivery proof for the invoice note. */
  proof: string;
  /** Display txid of the Zcash transaction that carries the note. */
  txid: string;
}

const PROOF = /^zdp:1:[A-Za-z0-9_-]+$/;
const TXID = /^[0-9a-f]{64}$/;

export function encodeLink(link: BilletLink): string {
  if (!PROOF.test(link.proof) || !TXID.test(link.txid)) throw new Error("bad billet link");
  return `#t=${link.txid}&p=${link.proof}`;
}

export function decodeLink(fragment: string): BilletLink | null {
  const p = new URLSearchParams(fragment.replace(/^#/, ""));
  const proof = p.get("p") ?? "";
  const txid = (p.get("t") ?? "").toLowerCase();
  return PROOF.test(proof) && TXID.test(txid) ? { proof, txid } : null;
}
