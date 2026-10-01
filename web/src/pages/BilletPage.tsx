import { useEffect, useState } from "react";
import { Link } from "react-router";
import { createPublicClient, http, type Hex } from "viem";
import { Check, ChevronDown, Copy as CopyIcon, ExternalLink, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { decodeLink, toUnits } from "@billet/core";
import { Button, CheckLine, Copy, Serial, Stamp, Wordmark } from "../components/paper.tsx";
import { chainById, tempoExplorer, zcashExplorer } from "../lib/config.ts";
import { explain, short, usd, useBillet } from "../lib/useBillet.ts";
import { payWithMemo } from "../lib/tempo.ts";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const stamp = (d: Date) =>
  d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function BilletPage() {
  const [link] = useState(() => decodeLink(window.location.hash));
  const { steps, sealed, status, error, setError, refreshPayment } = useBillet(link);
  const [paying, setPaying] = useState(false);
  const [paidAt, setPaidAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const inv = sealed?.invoice;
  const chain = inv ? chainById(inv.chainId) : undefined;
  const testnet = chain?.testnet === true;
  const payment = status?.payments[0];

  useEffect(() => {
    if (!payment || !chain) return;
    createPublicClient({ chain, transport: http() })
      .getBlock({ blockNumber: payment.block })
      .then((b) => setPaidAt(new Date(Number(b.timestamp) * 1000)))
      .catch(() => undefined);
  }, [payment, chain]);

  async function pay() {
    if (!sealed || !chain) return;
    setPaying(true);
    setError(null);
    try {
      const owed = toUnits(sealed.invoice.amount) - (status?.received ?? 0n);
      await payWithMemo(chain, sealed.invoice.token as Hex, sealed.invoice.payTo as Hex, owed, sealed.id);
      await refreshPayment(sealed);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0]! : String(err));
    } finally {
      setPaying(false);
    }
  }

  if (!link) {
    return (
      <Frame>
        <Copy className="mx-auto max-w-xl p-8">
          <h1 className="text-2xl font-[750]">This link holds no billet.</h1>
          <p className="mt-3 text-canary-ink">
            A billet link ends in <span className="typed">#t=…&amp;p=zdp:1:…</span>. The part after the # never reaches any server, so
            check that the whole link was copied.
          </p>
          <div className="mt-6">
            <Button href="/new">Write an invoice</Button>
          </div>
        </Copy>
      </Frame>
    );
  }

  const failed = Object.values(steps).includes("fail");
  const verified = steps.fetch === "ok" && steps.proof === "ok" && steps.invoice === "ok" && steps.tempo === "ok";
  const amount = inv ? usd(toUnits(inv.amount)) : "";

  return (
    <Frame>
      <Copy
        className="mx-auto max-w-3xl"
        stub={
          <div className="flex h-full flex-col justify-between text-canary-ink">
            <div>
              <div className="form-label">{status?.paid ? "Receipt" : "Client copy"}</div>
              <div className="mt-2">
                <Serial id={sealed?.id} />
              </div>
            </div>
            <p className="text-[0.8rem] leading-snug">This link opens this invoice and nothing else.</p>
          </div>
        }
      >
        <div className="relative p-6 sm:p-9">
          {!inv && !error && (
            <div className="flex items-center gap-3 py-10 text-canary-ink">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="text-[1.1rem]">Opening the sealed invoice…</span>
            </div>
          )}

          {!inv && error && (
            <div>
              <h1 className="text-[clamp(1.6rem,4vw,2.3rem)] leading-[1.08] font-[780] tracking-[-0.025em]">{explain(error).title}</h1>
              <p role="alert" className="mt-4 max-w-[60ch] text-[1rem] font-[600] text-serial">
                {explain(error).detail}
              </p>
            </div>
          )}

          {inv && (
            <>
              <div className="flex items-start justify-between gap-4">
                <h1
                  className="max-w-[18ch] text-[clamp(1.9rem,5vw,3rem)] leading-[1.02] font-[800] tracking-[-0.03em]"
                  style={{ fontVariationSettings: '"wdth" 104' }}
                >
                  {status?.paid ? (
                    <>
                      {inv.to} paid {inv.from} <span className="text-carbon">{amount}</span>
                    </>
                  ) : (
                    <>
                      {inv.from} requests <span className="text-carbon">{amount}</span> from {inv.to}
                    </>
                  )}
                </h1>
                <div className="shrink-0 sm:hidden">
                  <Serial id={sealed?.id} />
                </div>
              </div>

              <dl className="mt-7 grid gap-x-10 gap-y-4 sm:grid-cols-[auto_1fr]">
                <dt className="form-label pt-1 text-canary-ink">For</dt>
                <dd className="typed text-[1.1rem]">{inv.work}</dd>
                {status?.paid ? (
                  <>
                    <dt className="form-label pt-1 text-canary-ink">Paid</dt>
                    <dd className="typed text-[1.05rem]">
                      {paidAt ? stamp(paidAt) : "…"}
                      {payment && <span className="block text-[0.85rem] text-carbon-soft">from {short(payment.from, 4)}</span>}
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="form-label pt-1 text-canary-ink">Due</dt>
                    <dd className="typed text-[1.05rem]">{longDate(inv.due)}</dd>
                  </>
                )}
                <dt className="form-label pt-1 text-canary-ink">{status?.paid ? "Paid to" : "Pay to"}</dt>
                <dd className="typed text-[0.95rem] break-all">
                  {inv.payTo}
                  <span className="block text-[0.82rem] text-carbon-soft">OUSD on {chain?.name ?? `chain ${inv.chainId}`}</span>
                </dd>
              </dl>

              {status?.paid && (
                <div className="mt-2 flex justify-end pr-2 sm:absolute sm:top-24 sm:right-10 sm:mt-0">
                  <Stamp sub={testnet ? "TEMPO TESTNET" : "ON TEMPO"} />
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                {status && !status.paid && (
                  <Button onClick={pay} disabled={paying}>
                    <Wallet className="h-4 w-4" />
                    {paying ? "Confirm in your wallet…" : `Pay ${usd(status.due - status.received)}`}
                  </Button>
                )}
                {status?.paid && payment && chain && (
                  <a href={tempoExplorer(chain, payment.tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-[650] text-carbon underline">
                    Payment on Tempo <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href).then(() => setCopied(true))}
                  className="inline-flex items-center gap-1.5 text-[0.95rem] font-[650] text-canary-ink underline hover:text-carbon"
                >
                  {copied ? <Check className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  {copied ? "Copied" : status?.paid ? "Copy receipt link" : "Copy link"}
                </button>
              </div>
              {status && !status.paid && (
                <p className="mt-3 text-[0.85rem] text-canary-ink">
                  {testnet ? "Tempo testnet: paid with test OUSD, no real money moves. " : "Paid in OUSD from any EVM wallet; the fee comes out of the OUSD. "}
                  Check the pay-to address before paying.
                </p>
              )}
              {error && (
                <p role="alert" className="mt-4 max-w-[60ch] text-[0.95rem] font-[600] text-serial">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="perforation-x h-2" aria-hidden="true" />

        <details className="group bg-canary-deep/40" open={failed}>
          <summary className="flex cursor-pointer list-none flex-col items-start gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-9 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-start gap-2.5 text-[1rem] font-[700] sm:items-center">
              {verified ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-carbon" />
              ) : failed ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-serial" />
              ) : (
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-canary-ink" />
              )}
              <span className={verified ? "text-carbon" : failed ? "text-serial" : ""}>
                {verified ? "Verified in your browser: sealed on Zcash, matched on Tempo" : failed ? "A check failed" : "Checking in your browser…"}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 pl-7 text-[0.88rem] font-[650] text-canary-ink underline sm:pl-0 sm:no-underline">
              How this was checked <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
            </span>
          </summary>
          <div className="px-6 pb-7 sm:px-9">
            <ul className="text-[0.95rem]">
              <CheckLine state={steps.fetch} detail={<a className="underline" href={zcashExplorer(link.txid)} target="_blank" rel="noreferrer">{short(link.txid, 8)}</a>}>
                Fetched the Zcash transaction from a public light wallet server
              </CheckLine>
              <CheckLine state={steps.proof} detail={sealed ? `${sealed.delivery.pool} note, ${sealed.height ? `block ${sealed.height}` : "in the mempool"}` : undefined}>
                The delivery proof matches the transaction's bytes
              </CheckLine>
              <CheckLine state={steps.invoice} detail={sealed ? `billet id ${short(sealed.id, 8)}` : undefined}>
                The invoice above is the note's memo, word for word
              </CheckLine>
              <CheckLine
                state={steps.tempo}
                detail={status ? `${usd(status.received)} of ${usd(status.due)} received with this id as the memo` : undefined}
              >
                Looked for Tempo payments whose memo is this billet id
              </CheckLine>
            </ul>
            <p className="mt-4 max-w-[62ch] text-[0.85rem] leading-relaxed text-canary-ink">
              The invoice is private: it lives only in one shielded Zcash note, and this link carries a proof for that note, not a viewing
              key. The payment is public: its amount, both addresses and the billet id are on Tempo. The billet id is a hash of the
              invoice text, so this link proves the payment and the invoice are the same.
            </p>
          </div>
        </details>
      </Copy>
    </Frame>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 pt-6 pb-16 sm:px-8">
      <header className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
        <Link to="/" aria-label="Billet home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-5 text-[0.95rem] font-[650]">
          <Link to="/docs" className="underline decoration-ink/30 hover:text-carbon">
            Docs
          </Link>
          <Link to="/new" className="underline decoration-ink/30 hover:text-carbon">
            Write an invoice
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
