import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { Copy as CopyIcon, KeyRound, Link2, Mail, MessageCircle, QrCode, Share2, Smartphone } from "lucide-react";
import { createPublicClient, http, type Chain } from "viem";
import { tempo, tempoModerato } from "viem/chains";
import {
  byteLength,
  decodeInvoice,
  encodeInvoice,
  toUnits,
  encodeLink,
  getLatestHeight,
  InvoiceError,
  MEMO_MAX_BYTES,
  newNonce,
  sealFromTxid,
  zip321,
  stablecoins,
  watchForSeal,
  withProxies,
  type Invoice,
} from "@billet/core";
import { Button, Copy, Serial } from "../components/paper.tsx";
import { Ledger, type RepeatInvoice } from "../components/Ledger.tsx";
import { Frame } from "./BilletPage.tsx";
import { issueChain, lightwalletdProxies, SEAL_AMOUNT_ZEC } from "../lib/config.ts";
import { addIssued, loadPending, loadProfile, savePending, saveProfile, type PendingSeal } from "../lib/ledger.ts";
import { proofLib } from "../lib/proof.ts";
import { usd } from "../lib/useBillet.ts";
import { connectWallet } from "../lib/tempo.ts";
import { createIssuer, loadIssuer, zcashSupported, type Issuer } from "../lib/zcash.ts";

const NETWORKS: { chain: Chain; label: string; note: string }[] = [
  { chain: tempo, label: "Tempo mainnet", note: "Real stablecoins" },
  { chain: tempoModerato, label: "Tempo testnet", note: "Test stablecoins, no real money" },
];

const inTwoWeeks = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

export function IssuePage() {
  // Isolation headers only arrive on a full load of /new; an in-app link gets here without them, so load once more.
  useEffect(() => {
    if (crossOriginIsolated) return;
    try {
      if (sessionStorage.getItem("billet.isolate")) return;
      sessionStorage.setItem("billet.isolate", "1");
    } catch {
      return;
    }
    window.location.reload();
  }, []);
  useEffect(() => {
    if (crossOriginIsolated) {
      try {
        sessionStorage.removeItem("billet.isolate");
      } catch {
        /* nothing to clear */
      }
    }
  }, []);
  const profile = loadProfile();
  const [issuer, setIssuer] = useState<Issuer | null>(() => loadIssuer());
  const [creating, setCreating] = useState(false);
  const [chainId, setChainId] = useState<number>(profile?.chainId ?? issueChain.id);
  const [accept, setAccept] = useState<`0x${string}` | "USD">("USD");
  const [form, setForm] = useState({ from: profile?.from ?? "", to: "", work: "", amount: "", due: inTwoWeeks(), payTo: profile?.payTo ?? "" });
  const [pending, setPending] = useState<PendingSeal | null>(() => loadPending());
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [scan, setScan] = useState<{ scanned: number; tip: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [manualTxid, setManualTxid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [issuedVersion, setIssuedVersion] = useState(0);
  const abort = useRef<AbortController | null>(null);

  const chain = NETWORKS.find((n) => n.chain.id === chainId)?.chain ?? issueChain;

  const size = useMemo(() => {
    try {
      if (!form.payTo) return null;
      const draft: Invoice = { ...form, chainId, token: accept, payTo: form.payTo as `0x${string}`, since: 99_999_999, nonce: "0000000000000000" };
      return byteLength(encodeInvoice(draft));
    } catch {
      return null;
    }
  }, [form, chainId, accept]);

  function finish(memo: string, proof: string, txid: string) {
    const url = `${window.location.origin}/b${encodeLink({ proof, txid })}`;
    abort.current?.abort();
    setLinkUrl(url);
    addIssued({ url, memo, at: new Date().toISOString() });
    savePending(null);
    setIssuedVersion((v) => v + 1);
  }

  useEffect(() => {
    if (!pending || !issuer) return;
    const request = zip321({ address: issuer.address, amount: SEAL_AMOUNT_ZEC, memo: pending.memo, label: "Billet seal" });
    setUri(request);
    // Low error correction keeps a long memo request scannable: fewer, larger modules.
    QRCode.toDataURL(request, { margin: 2, scale: 6, color: { dark: "#1a1915", light: "#fcfbf6" }, errorCorrectionLevel: "L" }).then(setQr);
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
        finish(pending.memo, sealed.proof, sealed.txid);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      }
    })();
    return () => ctl.abort();
  }, [pending, issuer]);


  async function fillWallet() {
    try {
      const { address } = await connectWallet(chain);
      setForm((f) => ({ ...f, payTo: address }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function seal(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const since = Number(await createPublicClient({ chain, transport: http() }).getBlockNumber());
      const memo = encodeInvoice({ ...form, chainId, token: accept, payTo: form.payTo as `0x${string}`, since, nonce: newNonce() });
      if (!issuer) {
        if (!zcashSupported()) throw new Error("This browser cannot run the Zcash key library on this page. Try a current Chrome, Edge or Firefox.");
        setCreating(true);
        setIssuer(await createIssuer());
        setCreating(false);
      }
      const tip = await withProxies(lightwalletdProxies, getLatestHeight);
      const next = { memo, fromHeight: tip };
      saveProfile({ from: form.from, payTo: form.payTo, chainId });
      savePending(next);
      setLinkUrl(null);
      setPending(next);
    } catch (err) {
      setCreating(false);
      setError(err instanceof InvoiceError ? err.message : (err as Error).message);
    }
  }

  async function useTxid() {
    if (!pending || !issuer) return;
    setError(null);
    try {
      const { make } = await proofLib();
      const sealed = await sealFromTxid({ proxies: lightwalletdProxies, make, viewingKey: issuer.ufvk, memoText: pending.memo, txid: manualTxid });
      finish(pending.memo, sealed.proof, sealed.txid);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startOver() {
    abort.current?.abort();
    savePending(null);
    setPending(null);
    setQr(null);
    setUri(null);
    setScan(null);
    setLinkUrl(null);
    setManualTxid("");
    setForm((f) => ({ ...f, to: "", work: "", amount: "", due: inTwoWeeks() }));
  }

  function repeat(r: RepeatInvoice) {
    startOver();
    setForm((f) => ({ ...f, to: r.to, work: r.work, amount: r.amount, due: inTwoWeeks() }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The message people actually send: who, how much, for what, by when, and the link.
  const shareText = useMemo(() => {
    if (!linkUrl || !pending) return "";
    try {
      const inv = decodeInvoice(pending.memo);
      const due = new Date(`${inv.due}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
      return `${inv.from}: invoice for ${usd(toUnits(inv.amount))}, ${inv.work}, due ${due}. Pay here: ${linkUrl}`;
    } catch {
      return linkUrl;
    }
  }, [linkUrl, pending]);

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text).then(() => setCopied(tag));
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "typed w-full border-b border-ink/25 bg-transparent py-1.5 text-[1.02rem] outline-none placeholder:text-sheet-ink/50 focus:border-carbon";

  return (
    <Frame>
      <div className="mx-auto max-w-3xl space-y-6">
        {!pending && (
          <form onSubmit={seal}>
            <Copy tone="sheet" stub={<div className="text-sheet-ink"><div className="form-label">Original</div><div className="mt-2"><Serial /></div></div>}>
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h1 className="text-[1.6rem] leading-tight tracking-[-0.02em]">Write an invoice</h1>
                  <div role="radiogroup" aria-label="Network the client pays on" className="inline-flex rounded-[3px] border border-ink/20 p-0.5 text-[0.85rem]">
                    {NETWORKS.map((n) => (
                      <button
                        key={n.chain.id}
                        type="button"
                        role="radio"
                        aria-checked={chainId === n.chain.id}
                        title={n.note}
                        onClick={() => {
                          setChainId(n.chain.id);
                          setAccept("USD");
                        }}
                        className={`rounded-[2px] px-3 py-1.5 font-[650] transition-colors ${chainId === n.chain.id ? "bg-ink text-sheet" : "text-sheet-ink hover:text-ink"}`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                    <span className="form-label text-sheet-ink">Pay to (your Tempo address)</span>
                    <div className="flex items-end gap-3">
                      <input required className={`${input} min-w-0`} value={form.payTo} onChange={set("payTo")} placeholder="0x…" spellCheck={false} />
                      <button type="button" onClick={fillWallet} className="shrink-0 pb-1.5 text-[0.85rem] font-[650] text-carbon underline">
                        Use my wallet
                      </button>
                    </div>
                  </label>
                  <div className="sm:col-span-2">
                    <span className="form-label text-sheet-ink">Accept</span>
                    <div role="radiogroup" aria-label="Stablecoins the client can pay in" className="mt-2 flex flex-wrap gap-2">
                      {[{ symbol: "Any USD stablecoin", address: "USD" as const }, ...stablecoins(chainId)].map((t) => (
                        <button
                          key={t.address}
                          type="button"
                          role="radio"
                          aria-checked={accept === t.address}
                          onClick={() => setAccept(t.address)}
                          className={`rounded-[3px] border px-3 py-1.5 text-[0.88rem] font-[650] transition-colors ${accept === t.address ? "border-ink bg-ink text-sheet" : "border-ink/20 text-sheet-ink hover:text-ink"}`}
                        >
                          {t.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-[0.85rem] text-sheet-ink">
                    {size !== null ? `${size} of ${MEMO_MAX_BYTES} bytes in the sealed note.` : "Everything above goes into one shielded note."}
                    {chain.testnet ? " Payable on Tempo testnet." : " Payable in real stablecoins on Tempo."}
                  </span>
                  <Button type="submit" disabled={creating}>
                    <QrCode className="h-4 w-4" />
                    {creating ? "Preparing your sealing address…" : "Seal it on Zcash"}
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
                <div className="mx-auto w-64">
                  {qr ? <img src={qr} alt="Zcash payment request that seals this invoice" className="w-64 rounded-[3px]" /> : <div className="h-64 w-64 animate-pulse bg-canary-deep" />}
                  {uri && (
                    <div className="mt-3 flex justify-center gap-4 text-[0.85rem] font-[650]">
                      <a href={uri} className="inline-flex items-center gap-1.5 text-carbon underline">
                        <Smartphone className="h-4 w-4" /> Open in wallet
                      </a>
                      <button onClick={() => copy(uri, "uri")} className="inline-flex items-center gap-1.5 text-carbon underline">
                        <CopyIcon className="h-4 w-4" /> {copied === "uri" ? "Copied" : "Copy request"}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-[1.5rem] leading-tight tracking-[-0.02em]">Scan with your Zcash wallet</h1>
                  <p className="mt-3 text-canary-ink">
                    Zodl (formerly Zashi) or any wallet that reads payment QR codes. It sends {SEAL_AMOUNT_ZEC} ZEC with your invoice as the memo to
                    your sealing address. Billet watches new blocks from this browser and makes the link as soon as the note is mined.
                  </p>
                  <p className="typed mt-4 text-[0.9rem]">
                    {scan ? `Checked block ${scan.scanned}. Waiting for your note…` : "Starting the watch…"}
                  </p>
                  <p className="mt-1 text-[0.85rem] text-canary-ink">A Zcash block comes about every minute, so this usually takes one to three minutes after you send.</p>
                  <div className="mt-6 border-t border-ink/15 pt-4">
                    <label className="form-label text-canary-ink" htmlFor="txid">
                      Already sent it? Paste the transaction id from your wallet
                    </label>
                    <div className="mt-1 flex items-end gap-3">
                      <input
                        id="txid"
                        value={manualTxid}
                        onChange={(e) => setManualTxid(e.target.value)}
                        placeholder="64 hex characters"
                        spellCheck={false}
                        className="typed min-w-0 flex-1 border-b border-ink/25 bg-transparent py-1.5 text-[0.9rem] outline-none focus:border-carbon"
                      />
                      <button onClick={useTxid} disabled={manualTxid.trim().length < 64} className="shrink-0 pb-1.5 text-[0.85rem] font-[650] text-carbon underline disabled:opacity-40">
                        Use it
                      </button>
                    </div>
                  </div>
                  <button onClick={startOver} className="mt-6 text-[0.85rem] font-[650] text-canary-ink underline">
                    Change the invoice
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-[1.5rem] leading-tight tracking-[-0.02em]">Sealed. Send this link to your client.</h1>
                <p className="mt-3 max-w-[60ch] text-canary-ink">
                  It opens this invoice and nothing else, and becomes the receipt once they pay. Anyone you give it to can read the
                  invoice, so send it like you would send the invoice itself.
                </p>
                <div className="typed mt-5 rounded-[3px] bg-sheet p-3 text-[0.8rem] break-all">{linkUrl}</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => copy(linkUrl, "link")}>
                    <CopyIcon className="h-4 w-4" />
                    {copied === "link" ? "Copied" : "Copy link"}
                  </Button>
                  <Button kind="quiet" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button kind="quiet" href={`mailto:?subject=${encodeURIComponent("Invoice")}&body=${encodeURIComponent(shareText)}`}>
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <Button kind="quiet" onClick={() => navigator.share({ text: shareText }).catch(() => undefined)}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  )}
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

        <Ledger refreshKey={issuedVersion} onRepeat={repeat} />
      </div>
    </Frame>
  );
}
