import { useState } from "react";
import { Link } from "react-router";
import type { Hex } from "viem";
import { ExternalLink, Wallet } from "lucide-react";
import { decodeLink, toUnits } from "@billet/core";
import { Button, CheckLine, Copy, Field, Serial, Stamp, Wordmark } from "../components/paper.tsx";
import { chainById, tempoExplorer, zcashExplorer } from "../lib/config.ts";
import { explain, short, usd, useBillet } from "../lib/useBillet.ts";
import { payWithMemo } from "../lib/tempo.ts";

export function BilletPage() {
  const [link] = useState(() => decodeLink(window.location.hash));
  const { steps, sealed, status, error, setError, refreshPayment } = useBillet(link);
  const [paying, setPaying] = useState(false);

  async function pay() {
    if (!sealed) return;
    const chain = chainById(sealed.invoice.chainId)!;
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

  const inv = sealed?.invoice;
  const chain = inv ? chainById(inv.chainId) : undefined;
  const testnet = chain ? chain.testnet === true : false;

  return (
    <Frame>
      <Copy
        className="mx-auto max-w-3xl"
        stub={
          <div className="flex h-full flex-col justify-between text-canary-ink">
            <div>
              <div className="form-label">Client copy</div>
              <div className="mt-2">
                <Serial id={sealed?.id} />
              </div>
            </div>
            <div className="space-y-3 text-[0.8rem] leading-snug">
              <p>Opened with a delivery proof, not a key.</p>
              <p>This link shows this invoice and nothing else.</p>
            </div>
          </div>
        }
      >
        <div className="relative p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="form-label text-canary-ink">Invoice</div>
              <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.05] font-[780] tracking-[-0.025em]" style={{ fontVariationSettings: '"wdth" 104' }}>
                {inv ? inv.work : error ? explain(error).title : "Opening the sealed note…"}
              </h1>
            </div>
            <div className="sm:hidden">
              <Serial id={sealed?.id} />
            </div>
          </div>

          {status?.paid && (
            <div className="absolute top-20 right-6 sm:top-10 sm:right-10">
              <Stamp sub={chain?.testnet ? "TEMPO TESTNET" : "TEMPO"} />
            </div>
          )}

          {(inv || !error) && <div className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field label="From">{inv?.from ?? "…"}</Field>
            <Field label="Bill to">{inv?.to ?? "…"}</Field>
            <Field label="Amount">{inv ? usd(toUnits(inv.amount)) : "…"}</Field>
            <Field label="Due">{inv?.due ?? "…"}</Field>
            <Field label="Pay to" wide>
              {inv ? (
                <>
                  <span className="break-all">{inv.payTo}</span>
                  <span className="mt-1 block text-[0.8rem] text-carbon-soft">
                    OUSD on {chain?.name ?? `chain ${inv.chainId}`}
                  </span>
                </>
              ) : (
                "…"
              )}
            </Field>
          </div>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {inv && status && !status.paid && (
              <Button onClick={pay} disabled={paying}>
                <Wallet className="h-4 w-4" />
                {paying ? "Confirm in your wallet…" : `Pay ${usd(status.due - status.received)} in OUSD`}
              </Button>
            )}
            {status?.paid && status.payments[0] && chain && (
              <a href={tempoExplorer(chain, status.payments[0].tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-[650] text-carbon underline">
                Payment on Tempo <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {testnet && <span className="text-[0.85rem] text-canary-ink">Payable on Tempo testnet: no real money moves.</span>}
          </div>
          {error && (
            <p role="alert" className="mt-4 max-w-[60ch] text-[0.95rem] font-[600] text-serial">
              {inv ? error : explain(error).detail}
            </p>
          )}
        </div>

        <div className="perforation-x h-2" aria-hidden="true" />

        <div className="bg-canary-deep/40 p-6 sm:p-9">
          <h2 className="text-[1.05rem] font-[750]">Checked in your browser, just now</h2>
          <ul className="mt-2 text-[0.95rem]">
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
            Public on Tempo: the amount, both addresses and the billet id. Private: everything typed on this copy. It lives only in a
            shielded note, and this link carries a proof for that one note, not a viewing key.
          </p>
        </div>
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
