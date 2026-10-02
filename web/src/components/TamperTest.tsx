import { useState } from "react";
import { ExternalLink, FlaskConical, LoaderCircle } from "lucide-react";
import { billetId, paymentStatus, type SealedInvoice } from "@billet/core";
import { chainById } from "../lib/config.ts";
import { short, usd } from "../lib/useBillet.ts";
import { CheckLine } from "./paper.tsx";

type Result = { same: boolean; id: `0x${string}`; received: bigint };

/** Multiplies the amount line by 100, the edit a forger would actually want. */
function inflate(memo: string) {
  return memo.replace(/^amount=([\d.]+) USD$/m, (_, a: string) => `amount=${(Number(a) * 100).toString()} USD`);
}

/** The same link with one character of the proof changed. */
function tamperedLink() {
  const href = window.location.href;
  const at = href.indexOf("zdp:1:") + 12;
  if (at < 12) return href;
  const c = href[at]!;
  return href.slice(0, at) + (c === "A" ? "B" : "A") + href.slice(at + 1);
}

/**
 * Lets anyone try to forge this billet and watch the real checks refuse it:
 * edited text is not the sealed note, has a different id, and no Tempo payment carries that id.
 */
export function TamperTest({ sealed }: { sealed: SealedInvoice }) {
  const original = sealed.memoText.replace(/\0+$/, "");
  const [text, setText] = useState(original);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(next = text) {
    const chain = chainById(sealed.invoice.chainId);
    if (!chain) return;
    setBusy(true);
    setError(null);
    try {
      const id = billetId(next);
      const st = await paymentStatus({ ...sealed, id }, chain);
      setResult({ same: next === original, id, received: st.received });
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0]! : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 rounded-[14px] border border-line bg-card p-5">
      <div className="flex items-center gap-2 font-[620]">
        <FlaskConical className="h-[18px] w-[18px] text-zec-ink" /> Try to fake this invoice
      </div>
      <p className="mt-1 max-w-[60ch] text-[0.88rem] leading-relaxed text-muted">
        Edit the sealed text, or open this link with one character changed. The same checks run on your version.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        rows={Math.min(10, original.split("\n").length)}
        spellCheck={false}
        aria-label="Invoice text to test"
        className="typed mt-4 w-full resize-y rounded-[10px] border border-line bg-paper p-3 text-[0.8rem] leading-relaxed focus:border-zec focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9rem] font-[600]">
        <button
          onClick={() => {
            const next = inflate(text);
            setText(next);
            check(next);
          }}
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Make it 100 times bigger
        </button>
        <button onClick={() => check()} disabled={busy} className="inline-flex items-center gap-1.5 underline underline-offset-2 disabled:opacity-50">
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Check my version
        </button>
        <a href={tamperedLink()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-2">
          Open the link with one character changed <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {text !== original && (
          <button
            onClick={() => {
              setText(original);
              setResult(null);
            }}
            className="text-muted underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>
      {result && (
        <ul className="mt-4 text-[0.9rem]">
          <CheckLine state={result.same ? "ok" : "fail"}>{result.same ? "Same text as the sealed Zcash note" : "Not the text sealed in the Zcash note"}</CheckLine>
          <CheckLine state={result.id === sealed.id ? "ok" : "fail"} detail={`${short(result.id, 8)} vs sealed ${short(sealed.id, 8)}`}>
            {result.id === sealed.id ? "Billet id matches" : "Its billet id is different"}
          </CheckLine>
          <CheckLine state={result.received > 0n ? "ok" : "fail"}>
            Tempo payments carrying that id: {usd(result.received)}
          </CheckLine>
        </ul>
      )}
      {error && <p className="mt-3 text-[0.88rem] text-danger">{error}</p>}
    </div>
  );
}
