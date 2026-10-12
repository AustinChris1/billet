// The link fragment never reaches a server. It carries a delivery proof, not a key: it opens one note and nothing else.
export interface BilletLink {
  /** zdp:1: delivery proof for the invoice note. */
  proof: string;
  /** Display txid of the Zcash transaction that carries the note. */
  txid: string;
}

const PREFIX = "zdp:1:";
const PROOF = /^zdp:1:[A-Za-z0-9_-]+$/;
const BODY = /^[A-Za-z0-9_-]{43,}$/;
const TXID = /^[0-9a-f]{64}$/;

/** A zdp:1 proof starts with the transaction's 32-byte txid in internal byte order; the display txid is those bytes reversed. */
export function txidOfProof(proof: string): string | null {
  if (!PROOF.test(proof)) return null;
  const b64 = proof.slice(PREFIX.length, PREFIX.length + 43).replace(/-/g, "+").replace(/_/g, "/") + "=";
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  if (bin.length < 32) return null;
  let hex = "";
  for (let i = 31; i >= 0; i--) hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return hex;
}

/** Link fragment: just the proof body, since the txid is inside it. */
export function encodeLink(link: BilletLink): string {
  if (!PROOF.test(link.proof) || !TXID.test(link.txid) || txidOfProof(link.proof) !== link.txid) throw new Error("bad billet link");
  return `#${link.proof.slice(PREFIX.length)}`;
}

/** Reads the short form (#<proof>) and the first form (#t=<txid>&p=zdp:1:<proof>), so links already sent keep working. */
export function decodeLink(fragment: string): BilletLink | null {
  const f = fragment.replace(/^#/, "");
  if (BODY.test(f)) {
    const proof = PREFIX + f;
    const txid = txidOfProof(proof);
    return txid ? { proof, txid } : null;
  }
  const p = new URLSearchParams(f);
  const proof = p.get("p") ?? "";
  const txid = (p.get("t") ?? "").toLowerCase();
  return PROOF.test(proof) && TXID.test(txid) ? { proof, txid } : null;
}
