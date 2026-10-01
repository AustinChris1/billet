import { motion, useReducedMotion } from "framer-motion";
import { Check, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";

/** The mark: one copy torn from the pad at its perforation, one punched hole. One note, one place. */
export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="5" y="3" width="22" height="26" rx="1.5" fill="var(--color-canary)" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11h22" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.6 2.4" />
      <circle cx="16" cy="20" r="3.4" fill="currentColor" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <Mark />
      <span className="text-[1.35rem] font-[750] tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 112' }}>
        Billet
      </span>
    </span>
  );
}

export function Serial({ id }: { id?: string }) {
  const n = id ? parseInt(id.slice(2, 9), 16).toString().padStart(9, "0").slice(-7) : "0000000";
  return (
    <span className="font-[family-name:var(--font-type)] text-serial num text-[1rem] font-bold tracking-[0.06em] whitespace-nowrap">
      No. {n}
    </span>
  );
}

/** A copy from the pad: a perforated stub on the left, the sheet on the right. */
export function Copy({
  tone = "canary",
  stub,
  children,
  className = "",
}: {
  tone?: "canary" | "sheet";
  stub?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const bg = tone === "canary" ? "bg-canary" : "bg-sheet";
  return (
    <div className={`paper-shadow relative flex ${bg} ${className}`}>
      {stub !== undefined && (
        <>
          <div className="hidden w-40 shrink-0 flex-col p-5 sm:flex">{stub}</div>
          <div className="perforation hidden w-2 shrink-0 sm:block" aria-hidden="true" />
        </>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`border-b border-rule pb-2 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="form-label text-canary-ink">{label}</div>
      <div className="typed mt-1 text-[1.05rem] leading-snug break-words">{children}</div>
    </div>
  );
}

export type StepState = "wait" | "run" | "ok" | "fail";

/** One line of the in-browser check. Carbon blue is reserved for what was actually verified. */
export function CheckLine({ state, children, detail }: { state: StepState; children: ReactNode; detail?: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: state === "wait" ? 0.45 : 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3 py-2"
    >
      <span className="mt-0.5 shrink-0">
        {state === "ok" && <Check className="h-4 w-4 text-carbon" strokeWidth={3} />}
        {state === "run" && <LoaderCircle className="h-4 w-4 animate-spin text-canary-ink" />}
        {state === "fail" && <X className="h-4 w-4 text-serial" strokeWidth={3} />}
        {state === "wait" && <span className="block h-4 w-4 rounded-full border border-canary-ink/40" />}
      </span>
      <span className="min-w-0">
        <span className={state === "ok" ? "text-carbon" : state === "fail" ? "text-serial" : "text-canary-ink"}>{children}</span>
        {detail && <span className="typed mt-0.5 block text-[0.8rem] break-all text-carbon-soft">{detail}</span>}
      </span>
    </motion.li>
  );
}

/** The rubber stamp. It only ever lands after the Tempo payment is found on chain. */
export function Stamp({ label = "PAID", sub }: { label?: string; sub?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { scale: 1.9, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: -9 }}
      transition={{ type: "spring", stiffness: 520, damping: 24, mass: 0.9 }}
      className="pointer-events-none select-none"
      aria-label={sub ? `${label}, ${sub}` : label}
    >
      <div className="rounded-[6px] border-[3px] border-serial px-4 py-1.5 text-center text-serial mix-blend-multiply">
        <div className="text-[2.6rem] leading-none font-[800] tracking-[0.06em]" style={{ fontVariationSettings: '"wdth" 120' }}>
          {label}
        </div>
        {sub && <div className="typed mt-1 text-[0.72rem] font-bold tracking-[0.12em] text-serial">{sub}</div>}
      </div>
    </motion.div>
  );
}

export function Button({
  children,
  onClick,
  href,
  kind = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  kind?: "primary" | "quiet";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    kind === "primary"
      ? "bg-ink text-canary hover:bg-carbon disabled:bg-chip-deep disabled:text-sheet"
      : "border border-ink/30 text-ink hover:border-carbon hover:text-carbon disabled:opacity-50";
  const base = `inline-flex items-center justify-center gap-2 rounded-[3px] px-5 py-3 text-[0.95rem] font-[650] transition-colors duration-200 disabled:cursor-not-allowed ${cls}`;
  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}
