import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Check, Clock, Copy as CopyIcon, ExternalLink, RotateCcw } from "lucide-react";
import { billetId, decodeInvoice, paymentStatus, toUnits, type SealedInvoice } from "@billet/core";
import { chainById } from "../lib/config.ts";
import { loadIssued, type IssuedBillet } from "../lib/ledger.ts";
import { usd } from "../lib/useBillet.ts";

type Row = IssuedBillet & { to: string; work: string; amount: bigint; due: string; testnet: boolean; state: "checking" | "paid" | "unpaid" | "error" };

function toRow(b: IssuedBillet): Row | null {
  try {
    const inv = decodeInvoice(b.memo);
    return {
      ...b,
      to: inv.to,
      work: inv.work,
      amount: toUnits(inv.amount),
      due: inv.due,
      testnet: chainById(inv.chainId)?.testnet === true,
      state: "checking",
    };
  } catch {
    return null;
  }
}

/** The issuer's own book of billets. Payment state is read live from Tempo; the invoices themselves never left this browser. */
export interface RepeatInvoice {
  to: string;
  work: string;
  amount: string;
}

export function Ledger({ refreshKey, onRepeat }: { refreshKey?: unknown; onRepeat?: (r: RepeatInvoice) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const initial = loadIssued().map(toRow).filter((r): r is Row => r !== null);
    setRows(initial);
    initial.forEach((r) => {
      const inv = decodeInvoice(r.memo);
      const chain = chainById(inv.chainId);
      if (!chain) return;
      const sealed = { invoice: inv, memoText: r.memo, id: billetId(r.memo) } as SealedInvoice;
      paymentStatus(sealed, chain)
        .then((st) => setRows((all) => all.map((x) => (x.url === r.url ? { ...x, state: st.paid ? "paid" : "unpaid" } : x))))
        .catch(() => setRows((all) => all.map((x) => (x.url === r.url ? { ...x, state: "error" } : x))));
    });
  }, [refreshKey]);

  if (rows.length === 0) return null;
  const owed = rows.filter((r) => r.state === "unpaid").reduce((s, r) => s + r.amount, 0n);

  return (
    <section className="paper-shadow bg-sheet">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-6 pt-6 pb-4 sm:px-8">
        <h2 className="text-[1.35rem] tracking-[-0.02em]">Your billets</h2>
        <span className="text-[0.9rem] text-sheet-ink">
          {rows.length} sealed{owed > 0n ? `, ${usd(owed)} still owed` : ""}
        </span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.url} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-rule px-6 py-4 last:border-b-0 sm:grid-cols-[1fr_8rem_7rem_auto] sm:px-8">
            <div className="min-w-0">
              <div className="truncate font-[700]">{r.work}</div>
              <div className="truncate text-[0.88rem] text-sheet-ink">
                {r.to}, due {r.due}
                {r.testnet ? ", testnet" : ""}
              </div>
              <div className="mt-1 text-[0.85rem] font-[650] sm:hidden">
                <span className="typed num">{usd(r.amount)}</span>{" "}
                <span className={r.state === "paid" ? "text-carbon" : r.state === "unpaid" ? "text-serial" : "text-sheet-ink"}>
                  {r.state === "paid" ? "Paid" : r.state === "unpaid" ? "Unpaid" : r.state === "checking" ? "Checking…" : "Tempo unreachable"}
                </span>
              </div>
            </div>
            <div className="typed num hidden text-right sm:block">{usd(r.amount)}</div>
            <div className="hidden sm:block">
              {r.state === "paid" && (
                <span className="inline-flex items-center gap-1.5 font-[700] text-carbon">
                  <Check className="h-4 w-4" strokeWidth={3} /> Paid
                </span>
              )}
              {r.state === "unpaid" && (
                <span className="inline-flex items-center gap-1.5 font-[650] text-serial">
                  <Clock className="h-4 w-4" /> Unpaid
                </span>
              )}
              {r.state === "checking" && <span className="text-sheet-ink">Checking…</span>}
              {r.state === "error" && <span className="text-sheet-ink">Tempo unreachable</span>}
            </div>
            <div className="flex items-center gap-3">
              {onRepeat && (
                <button
                  onClick={() => {
                    const inv = decodeInvoice(r.memo);
                    onRepeat({ to: inv.to, work: inv.work, amount: inv.amount });
                  }}
                  className="text-sheet-ink hover:text-carbon"
                  aria-label={`Invoice ${r.to} again`}
                  title="Invoice this client again"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() =>
                  navigator.clipboard.writeText(r.url).then(() => {
                    setCopied(r.url);
                    toast.success("Link copied");
                  })
                }
                className="text-sheet-ink hover:text-carbon"
                aria-label={`Copy link for ${r.work}`}
              >
                {copied === r.url ? <Check className="h-4 w-4 text-carbon" /> : <CopyIcon className="h-4 w-4" />}
              </button>
              <a href={r.url} className="text-sheet-ink hover:text-carbon" aria-label={`Open ${r.work}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
