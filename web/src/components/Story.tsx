import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { BadgeCheck, Coins, Lock, PenLine, type LucideIcon } from "lucide-react";
import { Mark } from "./paper.tsx";
import { Orbits, Sunburst } from "./art.tsx";
import { TempoLogo, ZcashLogo } from "./site.tsx";

const STEPS: { icon: LucideIcon; title: string; body: string; tech: string }[] = [
  {
    icon: PenLine,
    title: "Write",
    body: "Who, for what, how much, pay where. One invoice, up to 512 bytes of text.",
    tech: "Canonical text memo; its keccak256 is the billet id.",
  },
  {
    icon: Lock,
    title: "Seal",
    body: "Your own Zcash wallet scans one QR and sends the invoice as a shielded note to an address nobody can spend from.",
    tech: "ZIP 321 request; Orchard or Ironwood note; spending key discarded in the browser.",
  },
  {
    icon: Coins,
    title: "Pay",
    body: "Your client pays in OUSD, USDT0, USDC or any USD stablecoin you accept on Tempo, with a passkey or any browser wallet. The fee comes out of the coin they send.",
    tech: "TIP-20 transferWithMemo; memo = billet id; Tempo Wallet passkey or EIP-1193.",
  },
  {
    icon: BadgeCheck,
    title: "Prove",
    body: "The link opens the invoice and shows the payment, checked in the reader's browser against both chains.",
    tech: "zcash-delivery-proof in WebAssembly; no viewing key in the link.",
  },
];

// The wire, in the diagram's 520 x 420 space: from the Zcash note to the Tempo payment.
const WIRE = "M128 132 C 250 132, 250 300, 392 300";

function Diagram({ step, progress }: { step: number; progress: number }) {
  const wire = useRef<SVGPathElement>(null);
  const [dot, setDot] = useState({ x: 128, y: 132 });
  // Current only travels the wire once the invoice is sealed, and reaches Tempo when it is paid.
  const along = Math.min(1, Math.max(0, (progress - 0.3) / 0.4));
  useEffect(() => {
    const p = wire.current;
    if (!p) return;
    const pt = p.getPointAtLength(p.getTotalLength() * along);
    setDot({ x: pt.x, y: pt.y });
  }, [along]);

  return (
    <div className="relative mx-auto aspect-[520/420] w-full max-w-[34rem]">
      <svg viewBox="0 0 520 420" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={WIRE} fill="none" stroke="var(--band-muted)" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="3 7" />
        <path ref={wire} d={WIRE} fill="none" stroke="var(--zec)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - along} />
        {along > 0 && along < 1 && <circle cx={dot.x} cy={dot.y} r="6" fill="var(--zec)" style={{ filter: "drop-shadow(0 0 8px #f3b724)" }} />}
      </svg>

      {/* Zcash side */}
      <div className="absolute top-[31%] left-[24.6%] h-[62%] w-[50%] -translate-x-1/2 -translate-y-1/2">
        <Sunburst className="h-full w-full text-band-ink [--ink:var(--band-ink)]" lines={56} inner={120} lit={step >= 1} />
      </div>
      <div className="absolute top-[31%] left-[24.6%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: step >= 1 ? 1 : 0.94 }}
          className="relative w-[8.5rem] rounded-[12px] border border-band-ink/15 bg-band-ink/[0.06] p-3 text-left backdrop-blur-sm sm:w-[9.5rem]"
        >
          <div className="flex items-center gap-1.5 text-[0.7rem] font-[600] tracking-[0.06em] text-band-muted uppercase">
            <ZcashLogo className="h-3.5 w-3.5" /> Shielded note
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-[80%] rounded-full bg-band-ink/30" />
            <div className="h-1.5 w-[60%] rounded-full bg-band-ink/20" />
            <div className="h-1.5 w-[70%] rounded-full bg-band-ink/20" />
          </div>
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                key="seal"
                initial={{ scale: 1.8, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
                className="absolute -right-4 -bottom-4"
              >
                <Mark className="h-11 w-11 drop-shadow-[0_6px_10px_#0006]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Tempo side */}
      <div className="absolute top-[71.4%] left-[75.4%] h-[80%] w-[66%] -translate-x-1/2 -translate-y-1/2">
        <Orbits className="h-full w-full" strong={step >= 2} />
      </div>
      <div className="absolute top-[71.4%] left-[75.4%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: step >= 2 ? 1 : 0.94, opacity: step >= 2 ? 1 : 0.55 }}
          className="relative w-[8.5rem] rounded-[12px] border border-band-ink/15 bg-band-ink/[0.06] p-3 backdrop-blur-sm sm:w-[9.5rem]"
        >
          <div className="flex items-center gap-1.5 text-[0.7rem] font-[600] tracking-[0.06em] text-band-muted uppercase">
            <span style={{ color: "var(--band-ink)" }}>
              <TempoLogo className="h-3.5 w-3.5" fg="var(--band)" />
            </span>
            Payment
          </div>
          <div className="mt-2 font-[family-name:var(--font-mono)] text-[0.78rem] text-band-ink">USD stablecoin</div>
          <div className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-[0.66rem] text-band-muted">memo = billet id</div>
          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                key="paid"
                initial={{ scale: 1.8, opacity: 0, rotate: 4 }}
                animate={{ scale: 1, opacity: 1, rotate: -9 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
                className="absolute -top-5 -right-5 rounded-[8px] border-[2.5px] border-zec bg-band px-2 py-0.5 font-[family-name:var(--font-display)] text-[1.15rem] text-zec"
              >
                PAID
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

/** The four steps, pinned while you scroll; one wire carries the billet id from Zcash to Tempo. */
export function Story() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const bar = useTransform(smooth, [0, 1], ["0%", "100%"]);
  const [progress, setProgress] = useState(reduce ? 1 : 0);
  useMotionValueEvent(smooth, "change", (v) => setProgress(v));
  const step = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length * 0.999 + 0.001));
  const active = STEPS[step]!;

  return (
    <section id="how" ref={ref} className="relative bg-band text-band-ink" style={{ height: reduce ? "auto" : `${STEPS.length * 85 + 40}vh` }}>
      <div className={`${reduce ? "" : "sticky top-0 flex h-dvh items-center"} overflow-hidden`}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <h2 className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">One note, one payment, one wire between them.</h2>
            <ol className="mt-8 hidden space-y-1 lg:block">
              {STEPS.map((s, i) => {
                const on = i === step;
                const Icon = s.icon;
                return (
                  <li key={s.title} className={`flex gap-4 rounded-[14px] p-4 transition-[background-color,opacity] duration-500 ${on ? "bg-band-ink/[0.07]" : "opacity-45"}`}>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-500 ${i <= step ? "bg-zec text-on-zec" : "border border-band-ink/25 text-band-muted"}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block text-[1.15rem] font-[620]">{s.title}</span>
                      <span className="mt-1 block max-w-[46ch] leading-relaxed text-band-muted">{s.body}</span>
                      {on && <span className="mt-2 block font-[family-name:var(--font-mono)] text-[0.78rem] text-zec">{s.tech}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-zec text-on-zec">
                  <active.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[1.2rem] font-[620]">{active.title}</span>
                <span className="ml-auto font-[family-name:var(--font-mono)] text-[0.8rem] text-band-muted">
                  {step + 1} of {STEPS.length}
                </span>
              </div>
              <p className="mt-3 leading-relaxed text-band-muted">{active.body}</p>
              <p className="mt-2 font-[family-name:var(--font-mono)] text-[0.76rem] text-zec">{active.tech}</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Diagram step={step} progress={progress} />
            <div className="mx-auto mt-4 h-[3px] max-w-[34rem] overflow-hidden rounded-full bg-band-ink/10" aria-hidden="true">
              <motion.div className="h-full bg-zec" style={{ width: reduce ? "100%" : bar }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
