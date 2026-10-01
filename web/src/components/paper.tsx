import { motion, useReducedMotion } from "framer-motion";
import { Check, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const B_PATH = "M10.5 6.5v18h7.2a4.6 4.6 0 0 0 0-9.2h-7.2m0 0h6a4.4 4.4 0 0 0 0-8.8h-6";
const B_PRESS = "translate(16 16.1) scale(0.62) translate(-15.6 -15.5)";
/** An uneven wax seal with the B pressed into it: the invoice is a sealed note. Gold, for Zcash. */
const WAX = "M29.75 16C29.8 16.45 29.76 16.9 29.71 17.35C29.67 17.8 29.55 18.24 29.47 18.68C29.39 19.12 29.3 19.56 29.24 20.02C29.17 20.47 29.14 20.94 29.08 21.42C29.02 21.9 29 22.41 28.87 22.88C28.74 23.35 28.59 23.84 28.32 24.23C28.06 24.63 27.7 24.99 27.3 25.27C26.89 25.55 26.39 25.74 25.92 25.92C25.45 26.09 24.93 26.19 24.48 26.33C24.02 26.47 23.59 26.59 23.19 26.76C22.78 26.92 22.42 27.12 22.05 27.32C21.68 27.52 21.33 27.76 20.95 27.96C20.58 28.15 20.19 28.36 19.79 28.49C19.39 28.62 18.96 28.71 18.54 28.75C18.11 28.79 17.67 28.76 17.25 28.71C16.83 28.66 16.41 28.56 16 28.48C15.59 28.4 15.2 28.29 14.8 28.22C14.4 28.16 14.01 28.11 13.6 28.07C13.19 28.03 12.78 28.02 12.36 28C11.94 27.97 11.51 27.95 11.07 27.91C10.63 27.87 10.18 27.81 9.73 27.74C9.27 27.66 8.8 27.58 8.34 27.47C7.87 27.35 7.38 27.23 6.94 27.04C6.5 26.84 6.06 26.6 5.7 26.3C5.33 26 5.02 25.62 4.75 25.23C4.48 24.85 4.26 24.41 4.05 23.98C3.85 23.56 3.66 23.12 3.52 22.67C3.37 22.23 3.25 21.77 3.19 21.31C3.12 20.85 3.12 20.37 3.14 19.9C3.16 19.44 3.25 18.97 3.33 18.52C3.4 18.07 3.51 17.64 3.58 17.22C3.65 16.8 3.7 16.4 3.74 16C3.77 15.6 3.77 15.2 3.77 14.8C3.77 14.39 3.75 13.98 3.75 13.56C3.76 13.15 3.77 12.73 3.8 12.3C3.83 11.87 3.88 11.44 3.94 11.01C4 10.57 4.07 10.12 4.15 9.67C4.23 9.21 4.31 8.73 4.42 8.26C4.54 7.8 4.66 7.3 4.86 6.85C5.05 6.41 5.28 5.96 5.58 5.58C5.89 5.21 6.26 4.88 6.67 4.63C7.07 4.37 7.55 4.19 8.02 4.05C8.48 3.91 8.99 3.85 9.47 3.78C9.95 3.72 10.43 3.7 10.89 3.66C11.34 3.61 11.78 3.57 12.21 3.5C12.64 3.43 13.04 3.33 13.46 3.22C13.87 3.1 14.28 2.95 14.7 2.83C15.13 2.7 15.56 2.55 16 2.47C16.44 2.39 16.9 2.33 17.34 2.35C17.79 2.36 18.24 2.44 18.67 2.56C19.1 2.68 19.52 2.88 19.92 3.06C20.33 3.25 20.71 3.47 21.11 3.65C21.51 3.84 21.92 3.98 22.33 4.16C22.74 4.33 23.18 4.46 23.56 4.69C23.93 4.93 24.29 5.22 24.57 5.56C24.84 5.91 25.04 6.36 25.23 6.77C25.41 7.19 25.53 7.64 25.68 8.05C25.83 8.46 25.96 8.86 26.12 9.24C26.27 9.62 26.43 9.97 26.62 10.32C26.81 10.67 27.02 11 27.25 11.34C27.49 11.68 27.77 12 28.03 12.35C28.29 12.7 28.59 13.06 28.83 13.45C29.06 13.84 29.3 14.25 29.45 14.67C29.61 15.1 29.71 15.55 29.75 16Z";

export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d={WAX} fill="#f3b724" />
      <path d={WAX} fill="none" stroke="#c98d06" strokeWidth="0.6" />
      <path d="M7.4 12.2a9.6 9.6 0 0 1 8.2-6.1" fill="none" stroke="#ffe39a" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="16" cy="16" r="10.1" fill="none" stroke="#c98d06" strokeWidth="1" />
      <path d={B_PATH} fill="none" stroke="#ffe39a" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" transform={`translate(0.5 0.55) ${B_PRESS}`} />
      <path d={B_PATH} fill="none" stroke="#6e4600" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" transform={B_PRESS} />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span className="font-[family-name:var(--font-display)] text-[1.55rem] leading-none tracking-[-0.01em]">Billet</span>
    </span>
  );
}

export function Serial({ id }: { id?: string }) {
  const n = id ? parseInt(id.slice(2, 9), 16).toString().padStart(9, "0").slice(-7) : "0000000";
  return <span className="typed num text-[0.9rem] font-[500] whitespace-nowrap text-muted">No. {n}</span>;
}

/** One invoice: a card with an optional stub on the left, divided by a tear line. */
export function Copy({
  stub,
  children,
  className = "",
}: {
  tone?: "canary" | "sheet";
  stub?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`paper-shadow relative flex overflow-hidden rounded-[14px] border border-line bg-card ${className}`}>
      {stub !== undefined && (
        <>
          <div className="hidden w-40 shrink-0 flex-col bg-surface/60 p-5 sm:flex">{stub}</div>
          <div className="perforation hidden w-px shrink-0 sm:block" aria-hidden="true" />
        </>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`border-b border-line pb-2 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="form-label text-muted">{label}</div>
      <div className="mt-1 text-[1.05rem] leading-snug break-words">{children}</div>
    </div>
  );
}

export type StepState = "wait" | "run" | "ok" | "fail";

/** One line of the in-browser check. Yellow is reserved for what was actually verified. */
export function CheckLine({ state, children, detail }: { state: StepState; children: ReactNode; detail?: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: state === "wait" ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3 py-1.5"
    >
      <span className="mt-0.5 shrink-0">
        {state === "ok" && (
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-zec text-on-zec">
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        )}
        {state === "run" && <LoaderCircle className="h-[18px] w-[18px] animate-spin text-zec-ink" />}
        {state === "fail" && (
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-danger text-card">
            <X className="h-3 w-3" strokeWidth={3.5} />
          </span>
        )}
        {state === "wait" && <span className="block h-[18px] w-[18px] rounded-full border border-line-strong" />}
      </span>
      <span className="min-w-0">
        <span className={state === "fail" ? "text-danger" : "text-ink"}>{children}</span>
        {detail && <span className="typed mt-0.5 block text-[0.8rem] break-all text-muted">{detail}</span>}
      </span>
    </motion.li>
  );
}

/** The stamp. It only ever lands after the Tempo payment is found on chain. */
export function Stamp({ label = "PAID", sub }: { label?: string; sub?: string }) {
  const reduce = useReducedMotion();
  const paid = label === "PAID";
  return (
    <motion.div
      initial={reduce ? false : { scale: 1.8, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: "spring", stiffness: 520, damping: 24, mass: 0.9 }}
      className="pointer-events-none select-none"
      aria-label={sub ? `${label}, ${sub}` : label}
    >
      <div className={`rounded-[10px] border-[3px] px-4 py-1.5 text-center ${paid ? "border-zec-ink text-zec-ink" : "border-muted text-muted"}`}>
        <div className="font-[family-name:var(--font-display)] text-[2.5rem] leading-none tracking-[0.04em]">{label}</div>
        {sub && <div className="typed mt-1 text-[0.68rem] font-[650] tracking-[0.14em]" style={{ color: "inherit" }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

export function Button({
  children,
  onClick,
  href,
  to,
  kind = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  to?: string;
  kind?: "primary" | "quiet" | "ink";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    kind === "primary"
      ? "bg-zec text-on-zec shadow-[0_1px_0_#0000001a,0_8px_20px_-10px_#e0a30f] hover:bg-zec-deep disabled:bg-line-strong disabled:text-muted disabled:shadow-none"
      : kind === "ink"
        ? "bg-ink text-paper hover:opacity-90 disabled:opacity-50"
        : "border border-line-strong text-ink hover:border-ink disabled:opacity-50";
  const base = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[0.95rem] font-[600] transition-[background-color,border-color,opacity,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${cls}`;
  if (to) {
    return (
      <Link to={to} className={base}>
        {children}
      </Link>
    );
  }
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
