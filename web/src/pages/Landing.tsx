import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, Fingerprint, KeyRound, Link2, Share2, Coins, Fuel } from "lucide-react";
import { decodeLink, stablecoins, symbolOf, toUnits } from "@billet/core";
import { Button, CheckLine, Copy, Mark, Serial, Stamp } from "../components/paper.tsx";
import { SiteFooter, SiteHeader, TempoLogo, ZcashLogo } from "../components/site.tsx";
import { Orbits, Sunburst } from "../components/art.tsx";
import { Story } from "../components/Story.tsx";
import { explain, usd, useBillet } from "../lib/useBillet.ts";
import { Faq } from "../components/Faq.tsx";

// Accepts fragments with or without the leading "#", since dotenv files treat "#" as a comment.
const SAMPLES: string[] = (import.meta.env.VITE_SAMPLE_LINKS ?? "")
  .split(",")
  .map((s: string) => s.trim().replace(/^#?/, "#"))
  .filter((s: string) => s.length > 1);

const DEMO = [
  ["From", "Ada Okafor"],
  ["Bill to", "Jonas Weber"],
  ["For", "Logo design, October"],
  ["Amount", "$400.00, any USD stablecoin"],
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

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
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="form-label text-muted">Specimen, not a real invoice</div>
        <Serial id="0x3f1c9a7" />
      </div>
      <dl className="space-y-3">
        {DEMO.map(([k, v], i) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 border-b border-line pb-2">
            <dt className="form-label text-muted">{k}</dt>
            <dd className={`text-[1.02rem] transition-opacity duration-500 ${i < typed ? "opacity-100" : "opacity-0"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex min-h-[5rem] items-center justify-end pr-2">{typed >= DEMO.length && <Stamp label="SPECIMEN" sub="NO PAYMENT" />}</div>
    </div>
  );
}

/** With a sample link configured, the hero runs every real check on it, in the visitor's browser. */
function LiveCopy({ fragment, onSealed }: { fragment: string; onSealed: (ok: boolean) => void }) {
  const [link] = useState(() => decodeLink(fragment));
  const { steps, sealed, status, error } = useBillet(link);
  useEffect(() => onSealed(steps.proof === "ok"), [steps.proof, onSealed]);
  const inv = sealed?.invoice;
  const rows: [string, string | undefined][] = [
    ["From", inv?.from],
    ["Bill to", inv?.to],
    ["For", inv?.work],
    ["Amount", inv ? `${usd(toUnits(inv.amount))} in ${inv.token === "USD" ? "any USD stablecoin" : symbolOf(inv.chainId, inv.token)}` : undefined],
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div className="inline-flex items-center gap-2 text-[0.8rem] font-[560] text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zec opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-zec" />
          </span>
          Live billet, checked in your browser now
        </div>
        <Serial id={sealed?.id} />
      </div>
      <dl className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr_1.1rem] items-baseline gap-3 border-b border-line pb-2">
            <dt className="form-label text-muted">{k}</dt>
            <dd className={`text-[1rem] ${v ? "text-ink" : "text-muted/50"}`}>{v ?? "…"}</dd>
            <span className="self-center">{v && <Check className="h-4 w-4 text-zec-ink" strokeWidth={3} />}</span>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-2">
        <ul className="text-[0.86rem]">
          <CheckLine state={steps.proof}>Zcash note proven</CheckLine>
          <CheckLine state={steps.invoice}>Invoice is the memo, word for word</CheckLine>
          <CheckLine state={steps.tempo}>{status ? (status.paid ? "Tempo payment found" : "No Tempo payment yet") : "Tempo payment"}</CheckLine>
        </ul>
        <div className="flex min-h-[4.5rem] items-center justify-end">{status?.paid && <Stamp sub="ON TEMPO" />}</div>
      </div>
      {error && <p className="mt-2 text-[0.85rem] text-danger">{explain(error).title}</p>}
    </div>
  );
}

function HeroArt() {
  const reduce = useReducedMotion();
  const [sealed, setSealed] = useState(false);
  return (
    <div className="relative flex min-h-[30rem] items-center justify-center lg:min-h-[38rem]">
      <Sunburst className="absolute top-1/2 left-1/2 w-[46rem] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[54rem]" />
      <Orbits className="absolute top-1/2 left-1/2 w-[40rem] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[48rem]" />
      <motion.div
        className="relative w-full max-w-[27rem]"
        initial={reduce ? false : { y: 30, opacity: 0, rotate: 2 }}
        animate={{ y: 0, opacity: 1, rotate: -1.5 }}
        transition={{ duration: 1, delay: 0.25, ease }}
      >
        <Copy>
          <div className="p-5 sm:p-7">{SAMPLES[0] ? <LiveCopy fragment={SAMPLES[0]} onSealed={setSealed} /> : <SpecimenCopy />}</div>
        </Copy>
        <motion.div
          className="absolute -top-7 right-2 sm:right-auto sm:-top-7 sm:-left-7"
          initial={reduce ? false : { scale: 2, opacity: 0, rotate: -40 }}
          animate={sealed || !SAMPLES[0] ? { scale: 1, opacity: 1, rotate: -14 } : { scale: 2, opacity: 0, rotate: -40 }}
          transition={{ type: "spring", stiffness: 380, damping: 18, delay: SAMPLES[0] ? 0 : 1.6 }}
          aria-hidden="true"
        >
          <Mark className="h-16 w-16 drop-shadow-[0_10px_14px_#23101540]" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function KeyGrid({ mode }: { mode: "key" | "link" }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-15% 0px" });
  const on = reduce || seen;
  return (
    <div ref={ref} className="grid grid-cols-8 gap-1.5" aria-hidden="true">
      {Array.from({ length: 32 }, (_, i) => {
        const lit = on && (mode === "key" || i === 13);
        return (
          <span
            key={i}
            className={`aspect-square rounded-[5px] border transition-colors duration-300 ${lit ? "border-zec bg-zec" : "border-line"}`}
            style={{ transitionDelay: reduce ? "0ms" : `${mode === "key" ? 200 + i * 30 : 600}ms` }}
          />
        );
      })}
    </div>
  );
}

function Phone({ light, dark, alt }: { light: string; dark: string; alt: string }) {
  return (
    <div className="mx-auto w-[15.5rem] rounded-[2.4rem] border border-line-strong bg-ink/90 p-2 paper-shadow sm:w-[17rem]">
      <div className="overflow-hidden rounded-[2rem] bg-paper">
        <img src={light} alt={alt} className="block w-full dark:hidden" loading="lazy" />
        <img src={dark} alt={alt} className="hidden w-full dark:block" loading="lazy" />
      </div>
    </div>
  );
}

export function Landing() {
  const reduce = useReducedMotion();
  const mainnet = stablecoins(4217).map((s) => s.symbol);
  return (
    <div className="min-h-dvh overflow-x-clip">
      <section className="relative">
        <SiteHeader
          links={[
            { href: "#how", label: "How it works" },
            { href: "#faq", label: "FAQ" },
          ]}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pt-6 pb-10 sm:px-8 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[1.08fr_1fr] lg:gap-6">
          <div className="relative z-10">
            <motion.h1
              className="text-[clamp(2.7rem,5.6vw,4.7rem)] leading-[1] tracking-[-0.02em]"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease }}
            >
              Private invoice. <span className="text-muted">Public payment.</span> One link.
            </motion.h1>
            <motion.p
              className="mt-5 max-w-[30rem] text-[1rem] leading-relaxed text-muted sm:mt-6 sm:text-[1.14rem]"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.12, ease }}
            >
              The invoice is sealed in one shielded Zcash note and paid in dollars on Tempo. One link proves both, then becomes the receipt.
            </motion.p>
            <motion.div
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-9"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.24, ease }}
            >
              <Button to="/new">
                Write an invoice <ArrowRight className="h-4 w-4" />
              </Button>
              {SAMPLES[0] && (
                <a href={`/b${SAMPLES[0]}`} className="group inline-flex items-center gap-2 font-[600] text-ink">
                  See a live billet <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              )}
            </motion.div>
            <div className="mt-10 hidden flex-wrap items-center gap-x-5 gap-y-3 text-[0.88rem] text-muted sm:flex">
              <span className="inline-flex items-center gap-2">
                <ZcashLogo className="h-5 w-5" /> Sealed on Zcash
              </span>
              <span className="inline-flex items-center gap-2 text-muted">
                <span className="text-ink">
                  <TempoLogo className="h-5 w-5" />
                </span>
                Paid on Tempo
              </span>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      <Story />

      <section className="relative">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-32">
          <Reveal>
            <h2 className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">The link carries a proof, not a key.</h2>
            <p className="mt-6 max-w-[52ch] text-[1.08rem] leading-relaxed text-muted">
              A Zcash viewing key opens a whole account, forever, and cannot be taken back. Payment tools that ask for one see every invoice you will ever
              receive. A billet link holds a delivery proof for one note, so whoever you send it to sees that invoice, the chain confirms it, and that is all.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 font-[620]">
                  <Eye className="h-[18px] w-[18px] text-zec-ink" /> The link shows
                </div>
                <ul className="mt-3 space-y-2 text-muted">
                  <li>this invoice, word for word</li>
                  <li>when it was sealed on Zcash</li>
                  <li>the stablecoin payment with its id</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 font-[620]">
                  <EyeOff className="h-[18px] w-[18px] text-muted" /> Nobody sees
                </div>
                <ul className="mt-3 space-y-2 text-muted">
                  <li>your wallet or its balance</li>
                  <li>your other invoices</li>
                  <li>where you moved the money</li>
                </ul>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="grid gap-5 sm:grid-cols-2 lg:self-center">
            <div className="rounded-[16px] border border-line bg-card p-6 paper-shadow">
              <div className="flex items-center gap-2 font-[620]">
                <KeyRound className="h-[18px] w-[18px]" /> A viewing key
              </div>
              <p className="mt-1 text-[0.9rem] text-muted">Every note, past and future.</p>
              <div className="mt-5">
                <KeyGrid mode="key" />
              </div>
            </div>
            <div className="rounded-[16px] border border-line bg-card p-6 paper-shadow">
              <div className="flex items-center gap-2 font-[620]">
                <Link2 className="h-[18px] w-[18px] text-zec-ink" /> A billet link
              </div>
              <p className="mt-1 text-[0.9rem] text-muted">One note. Nothing else.</p>
              <div className="mt-5">
                <KeyGrid mode="link" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <Reveal className="order-2 flex justify-center gap-5 lg:order-1">
            <div className="hidden translate-y-10 sm:block">
              <Phone light="/shots/new-light.png" dark="/shots/new-dark.png" alt="The Write an invoice form in Billet" />
            </div>
            <Phone light="/shots/receipt-light.png" dark="/shots/receipt-dark.png" alt="A paid billet: the invoice is now its own receipt" />
          </Reveal>
          <Reveal delay={0.1} className="order-1 lg:order-2">
            <h2 className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">Your client opens a link. That is the whole setup.</h2>
            <p className="mt-6 max-w-[50ch] text-[1.08rem] leading-relaxed text-muted">
              The page reads as a request: who is asking, for what, how much. Once paid, the same link reads as a receipt, with the payment checked on Tempo.
            </p>
            <ul className="mt-9 space-y-5">
              {[
                { icon: Fingerprint, title: "Pay with a passkey", body: "Face ID or a fingerprint through Tempo Wallet, or MetaMask if they prefer. No ZEC, no Zcash wallet." },
                { icon: Coins, title: "The coin they already hold", body: `On mainnet: ${mainnet.join(", ")}. Billet shows their balance in each.` },
                { icon: Fuel, title: "No gas token", body: "Tempo takes the network fee from the stablecoin being sent." },
                { icon: Share2, title: "Share anywhere", body: "Copy, WhatsApp, email or the phone's share sheet. The link is the invoice." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zec text-on-zec">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block font-[620]">{title}</span>
                    <span className="mt-0.5 block text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8 lg:py-28">
          <Reveal>
            <h2 className="max-w-[18ch] text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">What is private, what is public.</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-12 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line md:grid-cols-2">
            <div className="bg-card p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <ZcashLogo className="h-8 w-8" />
                <span className="text-[1.25rem] font-[620]">Private, on Zcash</span>
              </div>
              <p className="mt-4 leading-relaxed text-muted">
                The words of the invoice: who, for what, how much, pay where. Sealed in one shielded note that only the link can open.
              </p>
              <p className="mt-4 font-[family-name:var(--font-mono)] text-[0.8rem] text-zec-ink">0.0001 ZEC plus the network fee, once per invoice, paid by the issuer</p>
            </div>
            <div className="bg-card p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <span className="text-ink">
                  <TempoLogo className="h-8 w-8" />
                </span>
                <span className="text-[1.25rem] font-[620]">Public, on Tempo</span>
              </div>
              <p className="mt-4 leading-relaxed text-muted">
                The payment: its amount, both addresses and the billet id, a hash of the invoice text. Billet keeps the words private, not the dollars.
              </p>
              <p className="mt-4 font-[family-name:var(--font-mono)] text-[0.8rem] text-muted">TIP-20 transferWithMemo, memo = keccak256(invoice)</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Faq />

      <section className="relative overflow-hidden border-t border-line">
        <Sunburst className="pointer-events-none absolute top-1/2 left-1/2 w-[60rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-70" inner={190} />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-8">
          <Mark className="h-16 w-16" />
          <h2 className="mt-6 max-w-[16ch] text-[clamp(2.2rem,5vw,4rem)] leading-[1] tracking-[-0.02em]">Seal your next invoice.</h2>
          <p className="mt-5 max-w-[42ch] text-[1.08rem] text-muted">A Zcash wallet with a little ZEC, and a Tempo address to be paid at. About two minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/new">
              Write an invoice <ArrowRight className="h-4 w-4" />
            </Button>
            <Button kind="quiet" to="/docs">
              Read the docs
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
