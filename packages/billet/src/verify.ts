import { createPublicClient, http, parseAbiItem, type Chain } from "viem";
import { billetId, decodeInvoice, toUnits, type Invoice } from "./invoice.ts";
import { getTransaction, withProxies } from "./lightwalletd.ts";
import type { BilletLink } from "./link.ts";

/** zcash-delivery-proof's check(txHex, proof, network): JSON, or throws when the proof does not match the bytes. */
export type CheckFn = (txHex: string, proof: string, network: string) => string;

export interface Delivery {
  txid: string;
  pool: string;
  address: string;
  value: number;
  memoText: string;
}

export interface SealedInvoice {
  invoice: Invoice;
  memoText: string;
  id: `0x${string}`;
  delivery: Delivery;
  /** Zcash block height the note was mined at; 0 while still in the mempool. */
  height: number;
}

/** Fetches the note's transaction and checks the proof against its bytes; the invoice text comes out of that check. */
export async function openInvoice(link: BilletLink, proxies: string[], check: CheckFn): Promise<SealedInvoice> {
  const tx = await withProxies(proxies, (p) => getTransaction(p, link.txid));
  const delivery = JSON.parse(check(tx.txHex, link.proof, "mainnet")) as Delivery;
  if (delivery.txid !== link.txid) throw new Error("proof belongs to a different transaction");
  const invoice = decodeInvoice(delivery.memoText);
  return { invoice, memoText: delivery.memoText, id: billetId(delivery.memoText), delivery, height: tx.height };
}

export interface Payment {
  tx: `0x${string}`;
  from: `0x${string}`;
  amount: bigint;
  block: bigint;
}

export interface PaymentStatus {
  paid: boolean;
  received: bigint;
  due: bigint;
  payments: Payment[];
}

const transferWithMemo = parseAbiItem(
  "event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)",
);

// Tempo RPC refuses log queries wider than 100,000 blocks.
const WINDOW = 99_999n;

/** Looks for TIP-20 transfers to the invoice's address whose memo is this invoice's id, from the block it was written at. */
export async function paymentStatus(sealed: SealedInvoice, chain: Chain, fromBlock?: bigint): Promise<PaymentStatus> {
  if (sealed.invoice.chainId !== chain.id) throw new Error(`invoice is payable on chain ${sealed.invoice.chainId}`);
  const client = createPublicClient({ chain, transport: http() });
  const latest = await client.getBlockNumber();
  const ranges: [bigint, bigint][] = [];
  for (let start = fromBlock ?? BigInt(sealed.invoice.since); start <= latest; start += WINDOW + 1n) {
    ranges.push([start, start + WINDOW < latest ? start + WINDOW : latest]);
  }
  const chunks = await Promise.all(
    ranges.map(([from, to]) =>
      client.getLogs({
        address: sealed.invoice.token,
        event: transferWithMemo,
        args: { to: sealed.invoice.payTo, memo: sealed.id },
        fromBlock: from,
        toBlock: to,
      }),
    ),
  );
  const logs = chunks.flat();
  const payments = logs.map((l) => ({ tx: l.transactionHash, from: l.args.from!, amount: l.args.amount!, block: l.blockNumber }));
  const received = payments.reduce((s, p) => s + p.amount, 0n);
  const due = toUnits(sealed.invoice.amount);
  return { paid: received >= due, received, due, payments };
}
