import { getAddress, isAddress, keccak256, stringToBytes } from "viem";

// Orchard and Ironwood memos are 512 bytes, and the proof library decodes text memos, so an invoice is UTF-8 text.
export const MEMO_MAX_BYTES = 512;
export const HEADER = "BILLET/1";

/** The private half of an invoice. Only the payment (amount, recipient, billet id) appears on a public chain. */
export interface Invoice {
  from: string;
  to: string;
  /** What the money is for. */
  work: string;
  /** Decimal string with at most 6 places, in USD. */
  amount: string;
  /** Tempo chain id the invoice is payable on. */
  chainId: number;
  /** TIP-20 stablecoin to pay in, or "USD" for any listed USD stablecoin on that chain. */
  token: `0x${string}` | "USD";
  /** Tempo address that receives the payment. */
  payTo: `0x${string}`;
  /** ISO date, YYYY-MM-DD. */
  due: string;
  /** Tempo block height when the invoice was written; payments are searched from here. */
  since: number;
  /** 16 hex chars, so two identical invoices still get different ids. */
  nonce: string;
}

const KEYS = ["from", "to", "for", "amount", "pay", "token", "due", "since", "n"] as const;
const AMOUNT = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NONCE = /^[0-9a-f]{16}$/;

export class InvoiceError extends Error {}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function clean(field: string, value: string, max: number): string {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) throw new InvoiceError(`${field} is required`);
  if (v.length > max) throw new InvoiceError(`${field} is longer than ${max} characters`);
  return v;
}

/** Canonical memo text. Re-encoding a decoded invoice must give the same bytes, or its id would change. */
export function encodeInvoice(inv: Invoice): string {
  if (!AMOUNT.test(inv.amount) || Number(inv.amount) <= 0) throw new InvoiceError("amount must be a positive number");
  if (!DATE.test(inv.due) || Number.isNaN(Date.parse(`${inv.due}T00:00:00Z`))) throw new InvoiceError("due date must be YYYY-MM-DD");
  if (!Number.isSafeInteger(inv.chainId) || inv.chainId <= 0) throw new InvoiceError("bad chain id");
  if (!isAddress(inv.payTo, { strict: false }) || (inv.token !== "USD" && !isAddress(inv.token, { strict: false }))) {
    throw new InvoiceError("payment address and token must be 0x addresses");
  }
  if (!Number.isSafeInteger(inv.since) || inv.since < 0) throw new InvoiceError("bad Tempo block height");
  if (!NONCE.test(inv.nonce)) throw new InvoiceError("nonce must be 16 lowercase hex chars");

  const lines = [
    HEADER,
    `from=${clean("from", inv.from, 80)}`,
    `to=${clean("to", inv.to, 80)}`,
    `for=${clean("work", inv.work, 160)}`,
    `amount=${normaliseAmount(inv.amount)} USD`,
    `pay=tempo:${inv.chainId}:${getAddress(inv.payTo)}`,
    `token=${inv.token === "USD" ? "USD" : getAddress(inv.token)}`,
    `due=${inv.due}`,
    `since=${inv.since}`,
    `n=${inv.nonce}`,
  ];
  const text = lines.join("\n");
  const size = byteLength(text);
  if (size > MEMO_MAX_BYTES) throw new InvoiceError(`invoice is ${size} bytes, the limit is ${MEMO_MAX_BYTES}`);
  return text;
}

export function decodeInvoice(text: string): Invoice {
  const body = text.replace(/\0+$/, "");
  const lines = body.split("\n");
  if (lines[0] !== HEADER) throw new InvoiceError("not a Billet invoice");
  if (lines.length !== KEYS.length + 1) throw new InvoiceError("invoice has the wrong number of fields");
  const f: Record<string, string> = {};
  lines.slice(1).forEach((line, i) => {
    const eq = line.indexOf("=");
    if (eq < 1 || line.slice(0, eq) !== KEYS[i]) throw new InvoiceError(`field ${i + 1} should be "${KEYS[i]}"`);
    f[KEYS[i]!] = line.slice(eq + 1);
  });

  const pay = /^tempo:(\d+):(0x[0-9a-fA-F]{40})$/.exec(f.pay!);
  const amount = /^(\S+) USD$/.exec(f.amount!);
  if (!pay || !amount) throw new InvoiceError("unreadable payment line");
  const inv: Invoice = {
    from: f.from!,
    to: f.to!,
    work: f.for!,
    amount: amount[1]!,
    chainId: Number(pay[1]),
    payTo: pay[2] as `0x${string}`,
    token: f.token === "USD" ? "USD" : (f.token as `0x${string}`),
    due: f.due!,
    since: /^\d+$/.test(f.since!) ? Number(f.since) : -1,
    nonce: f.n!,
  };
  if (encodeInvoice(inv) !== body) throw new InvoiceError("invoice text is not canonical");
  return inv;
}

/** The billet id is the Tempo transfer memo: it commits the public payment to the exact private invoice text. */
export function billetId(memoText: string): `0x${string}` {
  return keccak256(stringToBytes(memoText.replace(/\0+$/, "")));
}

/** One spelling per amount ("400.50" becomes "400.5"), so one invoice cannot have two ids. */
export function normaliseAmount(amount: string): string {
  if (!amount.includes(".")) return amount;
  return amount.replace(/0+$/, "").replace(/\.$/, "");
}

/** Converts a decimal USD string to TIP-20 base units (always 6 decimals). */
export function toUnits(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  return BigInt(whole!) * 1_000_000n + BigInt((frac + "000000").slice(0, 6));
}

export function newNonce(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
