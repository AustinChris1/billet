import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { buildZip321 } from "@siwz/core";
import { Copy as CopyIcon, KeyRound, Link2, QrCode } from "lucide-react";
import {
  byteLength,
  encodeInvoice,
  encodeLink,
  getLatestHeight,
  InvoiceError,
  MEMO_MAX_BYTES,
  newNonce,
  watchForSeal,
  withProxies,
  type Invoice,
} from "@billet/core";
import { Button, Copy, Serial } from "../components/paper.tsx";
import { Frame } from "./BilletPage.tsx";
import { issueChain, lightwalletdProxies, OUSD, SEAL_AMOUNT_ZEC } from "../lib/config.ts";
import { proofLib } from "../lib/proof.ts";
import { connectWallet } from "../lib/tempo.ts";
import { createIssuer, loadIssuer, zcashSupported, type Issuer } from "../lib/zcash.ts";

const PENDING = "billet.pending.v1";
const ISSUED = "billet.issued.v1";

interface Pending {
  memo: string;
  fromHeight: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
}

const inTwoWeeks = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

export function IssuePage() {
  const [issuer, setIssuer] = useState<Issuer | null>(() => loadIssuer());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ from: "", to: "", work: "", amount: "", due: inTwoWeeks(), payTo: "" });
  const [pending, setPending] = useState<Pending | null>(() => read<Pending | null>(PENDING, null));
  const [qr, setQr] = useState<string | null>(null);
  const [scan, setScan] = useState<{ scanned: number; tip: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const draft: Invoice | null = useMemo(() => {
    try {
      if (!form.payTo) return null;
      return { ...form, chainId: issueChain.id, token: OUSD, payTo: form.payTo as `0x${string}`, nonce: "0000000000000000" };
    } catch {
      return null;
    }
  }, [form]);
  const size = useMemo(() => {
    try {
      return draft ? byteLength(encodeInvoice(draft)) : null;
    } catch {
      return null;
    }
  }, [draft]);

  useEffect(() => {
    if (!pending || !issuer) return;
    const uri = buildZip321({ address: issuer.address, amount: SEAL_AMOUNT_ZEC, memo: pending.memo, label: "Billet seal" });
    QRCode.toDataURL(uri, { margin: 1, scale: 6, color: { dark: "#1a1915", light: "#fcfbf6" }, errorCorrectionLevel: "M" }).then(setQr);
    const ctl = new AbortController();
    abort.current = ctl;
    (async () => {
      try {
        const { make } = await proofLib();
        const sealed = await watchForSeal({
          proxies: lightwalletdProxies,
          make,
          viewingKey: issuer.ufvk,
          memoText: pending.memo,
          fromHeight: pending.fromHeight,
          signal: ctl.signal,
          onHeight: (scanned, tip) => setScan({ scanned, tip }),
        });
        const url = `${window.location.origin}/b${encodeLink({ proof: sealed.proof, txid: sealed.txid })}`;
        setLinkUrl(url);
        write(ISSUED, [{ url, memo: pending.memo, at: new Date().toISOString() }, ...read<unknown[]>(ISSUED, [])]);
        write(PENDING, null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      }
    })();
    return () => ctl.abort();
  }, [pending, issuer]);

  async function makeIssuer() {
    setCreating(true);
    setError(null);
    try {
      setIssuer(await createIssuer());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function fillWallet() {
    try {
      const { address } = await connectWallet(issueChain);
      setForm((f) => ({ ...f, payTo: address }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function seal(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const memo = encodeInvoice({ ...form, chainId: issueChain.id, token: OUSD, payTo: form.payTo as `0x${string}`, nonce: newNonce() });
      const tip = await withProxies(lightwalletdProxies, getLatestHeight);
      const next = { memo, fromHeight: tip };
      write(PENDING, next);
      setLinkUrl(null);
      setPending(next);
    } catch (err) {
      setError(err instanceof InvoiceError ? err.message : (err as Error).message);
    }
  }

  function startOver() {
    abort.current?.abort();
    write(PENDING, null);
    setPending(null);
    setQr(null);
    setScan(null);
    setLinkUrl(null);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "typed w-full border-b border-ink/25 bg-transparent py-1.5 text-[1.02rem] outline-none placeholder:text-sheet-ink/50 focus:border-carbon";

  return (
    <Frame>
      <div className="mx-auto max-w-3xl space-y-6">
        {!issuer && (
          <Copy tone="sheet" className="p-6 sm:p-8">
            <h1 className="text-[1.6rem] leading-tight font-[780] tracking-[-0.02em]">First, a sealing address</h1>
            <p className="mt-3 max-w-[60ch] text-sheet-ink">
              Billet makes a Zcash address in this browser for sealing your invoices. Its spending key is thrown away the moment it is
              made, so it can receive the tiny sealing note and nothing can ever leave it. Only its viewing key stays here, to find
              and prove your notes.
            </p>
            <div className="mt-6">
              <Button onClick={makeIssuer} disabled={creating || !zcashSupported()}>
                <KeyRound className="h-4 w-4" />
                {creating ? "Making the address…" : "Make my sealing address"}
              </Button>
            </div>
            {!zcashSupported() && <p className="mt-3 text-[0.9rem] text-serial">This browser cannot run the Zcash key library on this page.</p>}
          </Copy>
        )}

        {issuer && !pending && (
          <form onSubmit={seal}>
            <Copy tone="sheet" stub={<div className="text-sheet-ink"><div className="form-label">Original</div><div className="mt-2"><Serial /></div></div>}>
              <div className="p-6 sm:p-8">
                <h1 className="text-[1.6rem] leading-tight font-[780] tracking-[-0.02em]">Write an invoice</h1>
                <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="form-label text-sheet-ink">From</span>
                    <input required className={input} value={form.from} onChange={set("from")} placeholder="Ada Okafor" />
                  </label>
                  <label className="block">
                    <span className="form-label text-sheet-ink">Bill to</span>
                    <input required className={input} value={form.to} onChange={set("to")} placeholder="Jonas Weber" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="form-label text-sheet-ink">For</span>
                    <input required className={input} value={form.work} onChange={set("work")} placeholder="Logo design, October" />
                  </label>
                  <label className="block">
                    <span className="form-label text-sheet-ink">Amount in USD</span>
                    <input required inputMode="decimal" className={`${input} num`} value={form.amount} onChange={set("amount")} placeholder="400" />
                  </label>
                  <label className="block">
                    <span className="form-label text-sheet-ink">Due</span>
                    <input required type="date" className={input} value={form.due} onChange={set("due")} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="form-label text-sheet-ink">Pay to (your Tempo address, paid in OUSD)</span>
                    <div className="flex items-end gap-3">
                      <input required className={`${input} min-w-0`} value={form.payTo} onChange={set("payTo")} placeholder="0x…" spellCheck={false} />
                      <button type="button" onClick={fillWallet} className="shrink-0 pb-1.5 text-[0.85rem] font-[650] text-carbon underline">
                        Use my wallet
                      </button>
                    </div>
                  </label>
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-[0.85rem] text-sheet-ink">
                    {size !== null ? `${size} of ${MEMO_MAX_BYTES} bytes in the sealed note` : "Everything above goes into one shielded note."}
                    {issueChain.testnet && " Payable on Tempo testnet."}
                  </span>
                  <Button type="submit">
                    <QrCode className="h-4 w-4" />
                    Seal it on Zcash
                  </Button>
                </div>
              </div>
            </Copy>
          </form>
        )}

        {issuer && pending && (
          <Copy className="p-6 sm:p-8">
            {!linkUrl ? (
              <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
                <div className="mx-auto w-56">
                  {qr ? <img src={qr} alt="Zcash payment request that seals this invoice" className="w-56 rounded-[3px]" /> : <div className="h-56 w-56 animate-pulse bg-canary-deep" />}
                </div>
                <div>
                  <h1 className="text-[1.5rem] leading-tight font-[780] tracking-[-0.02em]">Scan with your Zcash wallet</h1>
                  <p className="mt-3 text-canary-ink">
                    Zashi, Zodl or any wallet that reads payment QR codes. It sends {SEAL_AMOUNT_ZEC} ZEC with your invoice as the memo to
                    your sealing address. Billet watches the chain from this browser and makes the link as soon as the note is mined.
                  </p>
                  <p className="typed mt-4 text-[0.9rem]">
                    {scan ? `Scanned to block ${scan.scanned} of ${scan.tip}. Waiting for your note…` : "Starting the watch…"}
                  </p>
                  <button onClick={startOver} className="mt-6 text-[0.85rem] font-[650] text-canary-ink underline">
                    Change the invoice
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-[1.5rem] leading-tight font-[780] tracking-[-0.02em]">Sealed. Send this link to your client.</h1>
                <p className="mt-3 max-w-[60ch] text-canary-ink">
                  It opens this invoice and nothing else, and becomes the receipt once they pay. Anyone you give it to can read the
                  invoice, so send it like you would send the invoice itself.
                </p>
                <div className="typed mt-5 rounded-[3px] bg-sheet p-3 text-[0.8rem] break-all">{linkUrl}</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(linkUrl).then(() => setCopied(true));
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                  <Button kind="quiet" href={linkUrl}>
                    <Link2 className="h-4 w-4" />
                    Open the billet
                  </Button>
                  <Button kind="quiet" onClick={startOver}>
                    Write another
                  </Button>
                </div>
              </div>
            )}
          </Copy>
        )}

        {error && (
          <p role="alert" className="text-[0.95rem] font-[600] text-serial">
            {error}
          </p>
        )}
      </div>
    </Frame>
  );
}
