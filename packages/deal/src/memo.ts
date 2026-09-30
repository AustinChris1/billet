import { isAddress, isHex } from "viem";

// Orchard memos are 512 bytes; WebZjs only surfaces UTF-8 text memos, so every Primage memo is text.
export const MEMO_MAX_BYTES = 512;
export const TERMS_HEADER = "PRIMAGE/1";
export const EVENT_HEADER = "PRIMAGE/1 EVENT";

export type Milestone = "loaded" | "arrived";

/** The private half of a deal. Public terms (amount, dates, parties) live on Tempo under the same id. */
export interface DealTerms {
  chainId: number;
  escrow: `0x${string}`;
  id: `0x${string}`;
  /** UN/LOCODE of the port of loading, e.g. CNNGB. */
  pol: string;
  /** UN/LOCODE of the port of discharge, e.g. USLAX. */
  pod: string;
  /** 16-byte hex salt that keeps the on-chain container hash unguessable. */
  containerSalt: string;
  /** Invoice or purchase order reference. */
  ref: string;
  seller: string;
  goods: string;
}

export interface DealEvent {
  id: `0x${string}`;
  milestone: Milestone;
  container: string;
  /** ISO 8601 UTC time the carrier reported. */
  at: string;
  locode: string;
  vessel: string;
  source: string;
  evidence: `0x${string}`;
  tx: `0x${string}`;
}

const TERMS_KEYS = ["lc", "id", "pol", "pod", "cs", "ref", "seller", "goods"] as const;
const EVENT_KEYS = ["id", "m", "ctr", "at", "loc", "vessel", "src", "ev", "tx"] as const;

const LOCODE = /^[A-Z]{2}[A-Z2-9]{3}$/;
const SALT = /^[0-9a-f]{32}$/;
const CONTAINER = /^[A-Z]{4}\d{7}$/;

export class MemoError extends Error {}

function clean(field: string, value: string): string {
  const v = value.trim();
  if (/[\r\n]/.test(v)) throw new MemoError(`${field} cannot contain line breaks`);
  return v;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function render(header: string, pairs: [string, string][]): string {
  const text = [header, ...pairs.map(([k, v]) => `${k}=${v}`)].join("\n");
  const size = byteLength(text);
  if (size > MEMO_MAX_BYTES) throw new MemoError(`memo is ${size} bytes, the limit is ${MEMO_MAX_BYTES}`);
  return text;
}

function parse(text: string, header: string, keys: readonly string[]): Record<string, string> {
  const lines = text.replace(/\0+$/, "").split("\n");
  if (lines[0] !== header) throw new MemoError(`not a ${header} memo`);
  const out: Record<string, string> = {};
  const body = lines.slice(1);
  if (body.length !== keys.length) throw new MemoError(`expected ${keys.length} fields, got ${body.length}`);
  body.forEach((line, i) => {
    const eq = line.indexOf("=");
    const key = line.slice(0, eq);
    if (eq < 1 || key !== keys[i]) throw new MemoError(`field ${i + 1} should be "${keys[i]}"`);
    out[key] = line.slice(eq + 1);
  });
  return out;
}

export function encodeTerms(t: DealTerms): string {
  if (!Number.isSafeInteger(t.chainId) || t.chainId <= 0) throw new MemoError("bad chain id");
  if (!isAddress(t.escrow, { strict: false })) throw new MemoError("bad escrow address");
  if (!isHex(t.id) || t.id.length !== 66) throw new MemoError("bad credit id");
  const pol = clean("pol", t.pol).toUpperCase();
  const pod = clean("pod", t.pod).toUpperCase();
  if (!LOCODE.test(pol) || !LOCODE.test(pod)) throw new MemoError("ports must be UN/LOCODEs like CNNGB");
  if (!SALT.test(t.containerSalt)) throw new MemoError("container salt must be 32 lowercase hex chars");
  return render(TERMS_HEADER, [
    ["lc", `${t.chainId}:${t.escrow.toLowerCase()}`],
    ["id", t.id.toLowerCase()],
    ["pol", pol],
    ["pod", pod],
    ["cs", t.containerSalt],
    ["ref", clean("ref", t.ref)],
    ["seller", clean("seller", t.seller)],
    ["goods", clean("goods", t.goods)],
  ]);
}

export function decodeTerms(text: string): DealTerms {
  const f = parse(text, TERMS_HEADER, TERMS_KEYS);
  const [chain, escrow] = f.lc!.split(":");
  const terms: DealTerms = {
    chainId: Number(chain),
    escrow: escrow as `0x${string}`,
    id: f.id as `0x${string}`,
    pol: f.pol!,
    pod: f.pod!,
    containerSalt: f.cs!,
    ref: f.ref!,
    seller: f.seller!,
    goods: f.goods!,
  };
  // Re-encoding proves the memo is canonical, so its hash is the one the buyer committed to.
  if (encodeTerms(terms) !== text.replace(/\0+$/, "")) throw new MemoError("terms memo is not canonical");
  return terms;
}

export function encodeEvent(e: DealEvent): string {
  if (e.milestone !== "loaded" && e.milestone !== "arrived") throw new MemoError("bad milestone");
  const container = clean("ctr", e.container).toUpperCase();
  if (!CONTAINER.test(container)) throw new MemoError("container must look like KOCU4221161");
  return render(EVENT_HEADER, [
    ["id", e.id.toLowerCase()],
    ["m", e.milestone],
    ["ctr", container],
    ["at", clean("at", e.at)],
    ["loc", clean("loc", e.locode).toUpperCase()],
    ["vessel", clean("vessel", e.vessel)],
    ["src", clean("src", e.source)],
    ["ev", e.evidence.toLowerCase()],
    ["tx", e.tx.toLowerCase()],
  ]);
}

export function decodeEvent(text: string): DealEvent {
  const f = parse(text, EVENT_HEADER, EVENT_KEYS);
  return {
    id: f.id as `0x${string}`,
    milestone: f.m as Milestone,
    container: f.ctr!,
    at: f.at!,
    locode: f.loc!,
    vessel: f.vessel!,
    source: f.src!,
    evidence: f.ev as `0x${string}`,
    tx: f.tx as `0x${string}`,
  };
}

/** WebZjs joins every text memo in a transaction with "\n", so split on our headers rather than trust that separator. */
export function splitMemos(joined: string): string[] {
  const out: string[] = [];
  let current: string[] | null = null;
  for (const line of joined.split("\n")) {
    if (line === TERMS_HEADER || line === EVENT_HEADER) {
      if (current) out.push(current.join("\n"));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) out.push(current.join("\n"));
  return out;
}

export function isContainerNumber(value: string): boolean {
  return CONTAINER.test(value.trim().toUpperCase());
}
