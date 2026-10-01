import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { decodeLink, toUnits } from "@billet/core";
import { Button, CheckLine, Copy, Mark, Serial, Stamp, Wordmark } from "../components/paper.tsx";
import { explain, usd, useBillet } from "../lib/useBillet.ts";
import { Faq } from "../components/Faq.tsx";

const SAMPLES: string[] = (import.meta.env.VITE_SAMPLE_LINKS ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

const DEMO = [
  ["From", "Ada Okafor"],
  ["Bill to", "Jonas Weber"],
  ["For", "Logo design, October"],
  ["Amount", "$400.00 in OUSD"],
] as const;

/** Without a configured sample the hero is a specimen: it says so, and never claims a payment. */
function SpecimenCopy() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? DEMO.length : 0);
  useEffect(() => {
    if (reduce) return;
    const timers = DEMO.map((_, i) => setTimeout(() => setTyped(i + 1), 700 + i * 420));
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="form-label text-canary-ink">Specimen, not a real invoice</div>
        <Serial id="0x3f1c9a7" />
      </div>
      <dl className="space-y-3.5">
        {DEMO.map(([k, v], i) => (
          <div key={k} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 border-b border-rule pb-2">
            <dt className="form-label text-canary-ink">{k}</dt>
            <dd className={`typed text-[1.05rem] text-ink transition-opacity duration-500 ${i < typed ? "opacity-100" : "opacity-0"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex min-h-[5.5rem] items-center justify-end pr-2">
        {typed >= DEMO.length && <Stamp label="SPECIMEN" sub="NO PAYMENT" />}
      </div>
    </div>
  );
}

/** With a sample link configured, the hero runs every real check on it, in the visitor's browser. */
function LiveCopy({ fragment }: { fragment: string }) {
  const [link] = useState(() => decodeLink(fragment));
  const { steps, sealed, status, error } = useBillet(link);
  const inv = sealed?.invoice;
  const rows: [string, string | undefined][] = [
    ["From", inv?.from],
    ["Bill to", inv?.to],
    ["For", inv?.work],
    ["Amount", inv ? `${usd(toUnits(inv.amount))} in OUSD` : undefined],
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="form-label text-canary-ink">Live billet, checked in your browser now</div>
        <Serial id={sealed?.id} />
      </div>
      <dl className="space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[6.5rem_1fr_1.25rem] items-baseline gap-3 border-b border-rule pb-2">
            <dt className="form-label text-canary-ink">{k}</dt>
            <dd className={`typed text-[1.02rem] ${v ? "text-carbon" : "text-canary-ink/50"}`}>{v ?? "…"}</dd>
            <span className="self-center">{v && <Check className="h-4 w-4 text-carbon" strokeWidth={3} />}</span>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid items-end gap-2 sm:grid-cols-[1fr_auto]">
        <ul className="text-[0.86rem]">
          <CheckLine state={steps.proof}>Zcash note proven</CheckLine>
          <CheckLine state={steps.invoice}>Invoice is the memo, word for word</CheckLine>
          <CheckLine state={steps.tempo}>{status ? (status.paid ? "Tempo payment found" : "No Tempo payment yet") : "Tempo payment"}</CheckLine>
        </ul>
        <div className="flex min-h-[5rem] items-center justify-end pr-1">{status?.paid && <Stamp sub="ON TEMPO" />}</div>
      </div>
      {error && <p className="mt-2 text-[0.85rem] text-serial">{explain(error).title}</p>}
    </div>
  );
}

const STEPS = [
  {
    title: "Write",
    body: "Who, for what, how much, pay where. One invoice, up to 512 bytes of text.",
    tech: "Canonical text memo; its keccak256 is the billet id.",
  },
  {
    title: "Seal",
    body: "Your own Zcash wallet scans one QR and sends the invoice as a shielded note to an address nobody can spend from.",
    tech: "ZIP 321 payment request; Orchard or Ironwood note; spending key discarded in the browser.",
  },
  {
    title: "Pay",
    body: "Your client pays in OUSD on Tempo from any EVM wallet. The fee comes out of the OUSD, so they need nothing else.",
    tech: "TIP-20 transferWithMemo; memo = billet id.",
  },
  {
    title: "Prove",
    body: "The link opens the invoice and shows the payment, checked in the reader's browser against both chains.",
    tech: "zcash-delivery-proof in WebAssembly; no viewing key anywhere in the link.",
  },
];

export function Landing() {
  const reduce = useReducedMotion();
  return (
    <div className="min-h-dvh">
      <section className="bg-sheet">
        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pt-6 pb-10 sm:px-8">
          <header className="flex items-center justify-between">
            <Wordmark />
            <nav className="flex items-center gap-5 text-[0.95rem] font-[650]">
              <a href="#how" className="hidden underline decoration-ink/30 hover:text-carbon sm:inline">
                How it works
              </a>
              <a href="#faq" className="hidden underline decoration-ink/30 hover:text-carbon sm:inline">
                FAQ
              </a>
              <Link to="/docs" className="underline decoration-ink/30 hover:text-carbon">
                Docs
              </Link>
              <Link to="/new" className="underline decoration-ink/30 hover:text-carbon">
                Write an invoice
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <h1
                className="text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.95] font-[800] tracking-[-0.035em]"
                style={{ fontVariationSettings: '"wdth" 108' }}
              >
                An invoice only its link can open.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[1.15rem] leading-relaxed text-sheet-ink">
                Billet seals your invoice in one shielded Zcash note and gets you paid in dollars on Tempo. The link you send proves
                both, and opens nothing else: not your wallet, not your other clients.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                {SAMPLES[0] && (
                  <Button href={`/b${SAMPLES[0]}`}>
                    Open the live billet <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button kind={SAMPLES[0] ? "quiet" : "primary"} href="/new">
                  Write an invoice {!SAMPLES[0] && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <motion.div
              initial={reduce ? false : { y: 24, rotate: 1.5, opacity: 0 }}
              animate={{ y: 0, rotate: -1.2, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <Copy
                tone="canary"
                className="ring-1 ring-ink/10"
                stub={
                  <div className="flex h-full flex-col justify-between text-canary-ink">
                    <Mark className="h-8 w-8 text-ink" />
                    <p className="text-[0.78rem] leading-snug">Client copy. Tear along the line, keep the stub.</p>
                  </div>
                }
              >
                <div className="p-6 sm:p-8">
                  {SAMPLES[0] ? <LiveCopy fragment={SAMPLES[0]} /> : <SpecimenCopy />}
                </div>
              </Copy>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-sheet">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.02] font-[780] tracking-[-0.03em]">The link carries a proof, not a key.</h2>
            <p className="mt-5 max-w-[56ch] text-[1.05rem] leading-relaxed text-sheet-ink">
              A Zcash viewing key opens a whole account, forever, and cannot be taken back. Payment tools that ask for one see every
              invoice you will ever receive. A billet link holds a delivery proof for one note, so whoever you send it to sees that
              invoice, and the chain confirms it, and that is all.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-canary p-5 paper-shadow">
              <div className="form-label text-canary-ink">The link shows</div>
              <ul className="typed mt-3 space-y-2 text-[0.95rem]">
                <li>this invoice, word for word</li>
                <li>when it was sealed on Zcash</li>
                <li>the OUSD payment with its id</li>
              </ul>
            </div>
            <div className="border border-ink/15 p-5">
              <div className="form-label text-sheet-ink">Nobody sees</div>
              <ul className="typed mt-3 space-y-2 text-[0.95rem] text-ink">
                <li>your wallet or its balance</li>
                <li>your other invoices</li>
                <li>where you moved the money</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-chip">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.02] font-[780] tracking-[-0.03em]">Four sheets in one set</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="paper-shadow flex flex-col bg-sheet p-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-[1.4rem] font-[780] tracking-[-0.02em]">{s.title}</span>
                  <span className="typed text-serial text-[0.95rem] font-bold">{i + 1}/4</span>
                </div>
                <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed">{s.body}</p>
                <p className="typed mt-5 border-t border-rule pt-3 text-[0.8rem] leading-snug text-carbon">{s.tech}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink text-sheet">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-[1fr_1.2fr]">
          <h2 className="text-[1.8rem] leading-tight font-[780] tracking-[-0.02em] text-canary">What stays public</h2>
          <p className="max-w-[60ch] leading-relaxed text-sheet/85">
            The payment is an ordinary Tempo transfer: its amount, both addresses and the billet id are on a public chain. Billet keeps
            the words private, not the dollars. Sealing costs the issuer {"0.0001"} ZEC plus the network fee, once per invoice; the client
            never needs ZEC.
          </p>
        </div>
      </section>

      <Faq />

      <footer className="bg-chip">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[0.85rem] text-ink/75 sm:px-8">
          <span>Built for the Crypto World's Fair on Zcash and Tempo.</span>
          <span>
            Proofs by{" "}
            <a className="underline" href="https://github.com/saplingcash/zcash-delivery-proof" target="_blank" rel="noreferrer">
              zcash-delivery-proof
            </a>{" "}
            (Apache-2.0). Keys by{" "}
            <a className="underline" href="https://github.com/ZcashCommunityGrants/WebZjs" target="_blank" rel="noreferrer">
              WebZjs
            </a>
            .
          </span>
        </div>
      </footer>
    </div>
  );
}
