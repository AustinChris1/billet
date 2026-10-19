import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Chain } from "viem";
import { acceptedTokens, symbolOf, toUnits, type PaymentStatus, type SealedInvoice } from "@billet/core";
import { usd } from "../lib/useBillet.ts";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const stamp = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

const INK = "#231015";
const MUTED = "#6b5a5f";
const LINE = "#2310152e";

/**
 * The paper copy an accountant files: every value in full, what was checked and when, and a QR code back to the live link.
 * Hidden on screen; it is the only thing on the page when printed or saved as PDF.
 */
export function PrintReceipt({
  sealed,
  status,
  chain,
  paidAt,
  verified,
}: {
  sealed: SealedInvoice;
  status: PaymentStatus | null;
  chain: Chain | undefined;
  paidAt: Date | null;
  verified: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const url = window.location.href;
  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 0,
      scale: 4,
      color: { dark: INK, light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQr);
  }, [url]);

  const inv = sealed.invoice;
  const paid = !!status?.paid;
  const network = chain ? (chain.testnet ? "Tempo testnet (no real money)" : "Tempo mainnet") : `Chain ${inv.chainId}`;
  const accepts = acceptedTokens(inv.chainId, inv.token)
    .map((t) => t.symbol)
    .join(", ");
  const serial = parseInt(sealed.id.slice(2, 9), 16).toString().padStart(9, "0").slice(-7);

  return (
    <div
      className="hidden print:block"
      style={{
        color: INK,
        background: "#fff",
        fontFamily: "var(--font-form)",
        fontSize: "10.5pt",
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: `1.5px solid ${INK}`,
          paddingBottom: "10pt",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8pt" }}>
          <img src="/icon.svg" alt="" style={{ width: "26pt", height: "26pt" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "18pt" }}>Billet</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "8pt",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {paid ? "Receipt" : "Invoice"}
          </div>
          <div style={{ fontFamily: "var(--font-type)", fontSize: "10pt" }}>No. {serial}</div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "24pt",
          lineHeight: 1.1,
          margin: "18pt 0 4pt",
        }}
      >
        {paid ? `${inv.to} paid ${inv.from} ${usd(status!.received)}` : `${inv.from} requests ${usd(toUnits(inv.amount))} from ${inv.to}`}
      </h1>
      {paid && (
        <div
          style={{
            display: "inline-block",
            border: `2px solid ${INK}`,
            borderRadius: "4pt",
            padding: "1pt 8pt",
            fontWeight: 700,
            letterSpacing: "0.1em",
            fontSize: "10pt",
            margin: "4pt 0 6pt",
          }}
        >
          PAID
        </div>
      )}

      <Section title="Invoice">
        <Row k="From" v={inv.from} />
        <Row k="Bill to" v={inv.to} />
        <Row k="For" v={inv.work} />
        <Row k="Amount" v={`${usd(toUnits(inv.amount))} (USD)`} />
        <Row k="Due" v={longDate(inv.due)} />
        <Row k="Pay to" v={inv.payTo} mono />
        <Row k="Accepts" v={`${accepts} on ${network}`} />
      </Section>

      <Section title="Payment">
        {status && status.payments.length > 0 ? (
          <>
            <Row k="Status" v={paid ? "Paid in full" : `Part paid: ${usd(status.received)} of ${usd(status.due)}`} />
            {paidAt && <Row k="Paid on" v={stamp(paidAt)} />}
            {status.payments.map((p, i) => (
              <div key={p.tx} style={{ marginTop: i ? "6pt" : 0 }}>
                <Row k={status.payments.length > 1 ? `Payment ${i + 1}` : "Amount"} v={`${usd(p.amount)} in ${symbolOf(inv.chainId, p.token)}`} />
                <Row k="Paid from" v={p.from} mono />
                <Row k="Transaction" v={p.tx} mono />
                <Row k="Tempo block" v={p.block.toLocaleString("en-US")} />
              </div>
            ))}
          </>
        ) : (
          <Row k="Status" v={status ? "Not paid yet" : "Not checked"} />
        )}
      </Section>

      <Section title="Proof">
        <Row k="Sealed on" v={`Zcash mainnet, ${sealed.delivery.pool} note${sealed.height ? `, block ${sealed.height.toLocaleString("en-US")}` : ""}`} />
        <Row k="Zcash transaction" v={sealed.delivery.txid} mono />
        <Row k="Billet id" v={sealed.id} mono />
        <Row
          k="Checked"
          v={
            verified
              ? `${stamp(
                  new Date()
                )}, in the browser that printed this: the delivery proof matches the Zcash transaction, the invoice above is that note's memo word for word, and Tempo was searched for payments whose memo is the billet id.`
              : "The checks had not finished when this was printed."
          }
        />
      </Section>

      <div
        style={{
          display: "flex",
          gap: "14pt",
          alignItems: "flex-start",
          marginTop: "16pt",
          paddingTop: "12pt",
          borderTop: `1px solid ${LINE}`,
          breakInside: "avoid",
        }}
      >
        {qr && <img src={qr} alt="QR code of this billet's link" style={{ width: "92pt", height: "92pt", flexShrink: 0 }} />}
        <div style={{ fontSize: "9pt", color: MUTED }}>
          <div style={{ fontWeight: 600, color: INK, fontSize: "10pt" }}>Check it yourself</div>
          <p style={{ margin: "3pt 0 6pt" }}>
            This page is a printout. The link is the proof: scan the code or open the link, and any browser re-checks the invoice against Zcash and the payment against
            Tempo. The invoice is private, sealed in one shielded Zcash note. The payment is public on Tempo: its amount, both addresses and the billet id.
          </p>
          <div
            style={{
              fontFamily: "var(--font-type)",
              fontSize: "7pt",
              wordBreak: "break-all",
              color: INK,
            }}
          >
            {url}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "14pt", breakInside: "avoid" }}>
      <div
        style={{
          fontSize: "8pt",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          borderBottom: `1px solid ${LINE}`,
          paddingBottom: "3pt",
          marginBottom: "5pt",
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92pt 1fr",
        gap: "10pt",
        padding: "1.5pt 0",
      }}
    >
      <div style={{ color: MUTED }}>{k}</div>
      <div
        style={
          mono
            ? {
                fontFamily: "var(--font-type)",
                fontSize: "9pt",
                wordBreak: "break-all",
              }
            : undefined
        }
      >
        {v}
      </div>
    </div>
  );
}
