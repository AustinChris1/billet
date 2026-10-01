import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { openInvoice, paymentStatus, type BilletLink, type PaymentStatus, type SealedInvoice } from "@billet/core";
import type { StepState } from "../components/paper.tsx";
import { chainById, lightwalletdProxies } from "./config.ts";
import { proofLib } from "./proof.ts";

export type Steps = { fetch: StepState; proof: StepState; invoice: StepState; tempo: StepState };

export const short = (s: string, n = 6) => `${s.slice(0, n + 2)}…${s.slice(-n)}`;
export const usd = (units: bigint) => Number(formatUnits(units, 6)).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Turns library errors into a sentence that names the problem and what to do. */
export function explain(message: string): { title: string; detail: string } {
  if (/not a Billet invoice|wrong number of fields|unreadable payment|not canonical|field \d/i.test(message)) {
    return { title: "This note is not a Billet invoice.", detail: "The proof checks out, but the note it opens holds other text. Ask the sender for their billet link." };
  }
  if (/commit|decrypt|proof|txid|different transaction/i.test(message)) {
    return { title: "This proof does not match its transaction.", detail: "The link was changed or cut short. Ask the sender to copy it again." };
  }
  if (/HTTP|fetch|server|answered|empty response/i.test(message)) {
    return { title: "Could not reach a Zcash light wallet server.", detail: "Nothing is wrong with the link. Try again in a minute." };
  }
  return { title: "Could not open this billet.", detail: message };
}

/** Runs every check a billet link promises, in the reader's browser: Zcash note, proof, invoice text, Tempo payment. */
export function useBillet(link: BilletLink | null) {
  const [steps, setSteps] = useState<Steps>({ fetch: link ? "run" : "wait", proof: "wait", invoice: "wait", tempo: "wait" });
  const [sealed, setSealed] = useState<SealedInvoice | null>(null);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPayment = useCallback(async (s: SealedInvoice) => {
    const chain = chainById(s.invoice.chainId);
    if (!chain) throw new Error(`This invoice is payable on chain ${s.invoice.chainId}, which Billet does not know.`);
    setSteps((p) => ({ ...p, tempo: "run" }));
    const st = await paymentStatus(s, chain);
    setStatus(st);
    setSteps((p) => ({ ...p, tempo: "ok" }));
    return st;
  }, []);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    (async () => {
      try {
        const { check } = await proofLib();
        const opened = await openInvoice(link, lightwalletdProxies, (tx, proof, net) => {
          if (!cancelled) setSteps((p) => ({ ...p, fetch: "ok", proof: "run" }));
          const out = check(tx, proof, net);
          if (!cancelled) setSteps((p) => ({ ...p, proof: "ok", invoice: "run" }));
          return out;
        });
        if (cancelled) return;
        setSealed(opened);
        setSteps((p) => ({ ...p, invoice: "ok" }));
        await refreshPayment(opened);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setSteps((p) => {
          const failAt = (Object.keys(p) as (keyof Steps)[]).find((k) => p[k] === "run");
          return failAt ? { ...p, [failAt]: "fail" } : p;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [link, refreshPayment]);

  return { steps, sealed, status, error, setError, refreshPayment };
}
