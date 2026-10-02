import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "../components/site.tsx";
import { stablecoins } from "@billet/core";


function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 pt-14 text-[1.9rem] leading-tight tracking-[-0.02em] first:pt-0">
      {children}
    </h2>
  );
}
function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-[1.2rem] font-[750] tracking-[-0.01em]">{children}</h3>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 leading-[1.7] text-ink/85">{children}</p>;
}
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 leading-[1.65] text-ink/85">
          <span className="typed font-bold text-serial">{i + 1}.</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}
function Code({ children }: { children: ReactNode }) {
  return <code className="typed rounded-[2px] bg-chip/50 px-1 py-0.5 text-[0.88em] text-ink">{children}</code>;
}
function Pre({ children }: { children: string }) {
  return <pre className="typed mt-4 overflow-x-auto rounded-[3px] bg-ink p-4 text-[0.85rem] leading-relaxed text-canary">{children}</pre>;
}
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-[0.93rem]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="form-label border-b-2 border-ink py-2 pr-4 text-sheet-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-rule align-top">
              {r.map((c, j) => (
                <td key={j} className="py-2.5 pr-4 leading-snug">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Case({ who, children }: { who: string; children: ReactNode }) {
  return (
    <div className="mt-5 bg-canary/55 p-5">
      <div className="typed text-[0.78rem] font-bold tracking-[0.06em] text-serial">EXAMPLE</div>
      <div className="mt-1 text-[1.02rem] font-[750]">{who}</div>
      <div className="mt-1.5 leading-[1.65] text-ink/85">{children}</div>
    </div>
  );
}


const PAGES: { slug: string; title: string; body: () => ReactNode }[] = [
  { slug: "", title: "Overview", body: () => (<>
          <H2 id="overview">Overview</H2>
          <P>
            Billet is a private dollar invoice. You write an invoice, seal it in one shielded Zcash note, and send your client a link. The
            link opens that invoice in their browser, lets them pay it on Tempo in any USD stablecoin you accept, and then serves as the receipt.
          </P>
          <P>
            The link carries a <strong>delivery proof</strong>, not a key. A delivery proof discloses exactly one note: its value, its memo
            and the address it was paid to. Anyone can check it against the public Zcash chain without any key. A Zcash viewing key, by
            contrast, opens a whole account, every payment past and future, and cannot be taken back.
          </P>
          <Table
            head={["", "Where it lives", "Who can see it"]}
            rows={[
              ["Invoice text", "Memo of one shielded Zcash note", "Anyone holding the link"],
              ["Proof the text is that memo", "The link, as a zdp:1: string", "Anyone holding the link"],
              ["Billet id", "keccak256 of the invoice text", "Public, as the Tempo memo"],
              ["Payment", "TIP-20 transferWithMemo on Tempo", "Public"],
            ]}
          />

          <H2 id="credits">Open source</H2>
          <P>
            Billet is open source at{" "}
            <a className="font-[650] text-carbon underline" href="https://github.com/AustinChris1/billet" target="_blank" rel="noreferrer">
              github.com/AustinChris1/billet
            </a>
            . It builds on{" "}
            <a className="text-carbon underline" href="https://github.com/saplingcash/zcash-delivery-proof" target="_blank" rel="noreferrer">
              zcash-delivery-proof
            </a>{" "}
            (Apache-2.0),{" "}
            <a className="text-carbon underline" href="https://github.com/ZcashCommunityGrants/WebZjs" target="_blank" rel="noreferrer">
              WebZjs
            </a>{" "}
            (in a view-only build), and viem plus the Tempo Accounts SDK for Tempo.
          </P>
  </>) },
  { slug: "how-it-works", title: "How it works", body: () => (<>
          <H2 id="how">How it works</H2>
          <Steps
            items={[
              <>
                <strong>Write.</strong> Who it is from, who it is to, what it is for, the amount in USD, the due date and the Tempo address to
                pay. Billet writes this as plain text, at most 512 bytes.
              </>,
              <>
                <strong>Seal.</strong> Billet shows a ZIP 321 payment request as a QR code. Your Zcash wallet scans it and sends 0.0001 ZEC
                with the invoice text as the memo, to a sealing address Billet created in your browser.
              </>,
              <>
                <strong>Prove.</strong> Billet watches new blocks from your browser. When your note is mined, it makes a delivery proof for it
                and gives you the link.
              </>,
              <>
                <strong>Pay.</strong> Your client opens the link. Their browser fetches the Zcash transaction, checks the proof, shows the
                invoice, and offers to pay it with <Code>transferWithMemo</Code>, where the memo is the billet id.
              </>,
              <>
                <strong>Receipt.</strong> The same link looks for a Tempo payment to your address whose memo is that billet id. Once it
                finds one covering the amount, the copy is stamped PAID.
              </>,
            ]}
          />
          <P>
            The billet id is <Code>keccak256</Code> of the exact invoice text. Change one character of the invoice and its id changes, so a
            payment made for one invoice can never be shown as paying another.
          </P>

  </>) },
  { slug: "use-cases", title: "Use cases", body: () => (<>
          <H2 id="use-cases">Use cases</H2>
          <P>These are examples of who Billet is for. The names are illustrative.</P>
          <Case who="A freelancer billing a client in another country">
            Ada designs a logo for Jonas in Berlin. She wants dollars, Jonas does not hold crypto beyond a wallet with some USDT. She sends one
            link; Jonas pays with his fingerprint in a minute. Her accountant gets the same link at tax time and sees that invoice, not the client
            she would rather keep private, and not her tips.
          </Case>
          <Case who="A contractor paid by a DAO or a foundation">
            A grant milestone is invoiced as a billet. The treasury pays it in the stablecoin it already holds, with the billet id as the memo, so its books reconcile
            payment to invoice automatically. The contractor never hands the DAO a viewing key that would expose their other work.
          </Case>
          <Case who="A small supplier invoicing a business">
            A workshop invoices a shop for a wholesale order. The order details stay off the public chain; the shop's accounts team keeps
            the link as both invoice and proof of payment.
          </Case>
          <Case who="A consultant under a confidentiality agreement">
            The client's name and the engagement are confidential, but an auditor still needs to verify the payment. The auditor gets the
            link and checks it in a browser. Nothing about the engagement is published anywhere.
          </Case>
          <Case who="Settling a payment dispute">
            "I paid that invoice." The payer opens the link: the invoice text is proven by the Zcash note, and the payment with the
            matching memo is on Tempo. Both checks run in front of everyone, with no screenshots involved.
          </Case>

  </>) },
  { slug: "guide", title: "Sending, paying, checking", body: () => (<>
          <H2 id="send">Sending an invoice</H2>
          <P>You need a Zcash wallet that scans payment QR codes, such as Zodl (formerly Zashi), with a little ZEC, and a Tempo address.</P>
          <Steps
            items={[
              <>
                Open <Link to="/new" className="font-[650] text-carbon underline">Write an invoice</Link>. The first time you seal, Billet
                quietly creates your sealing address in your browser; it takes a few seconds and there is nothing to set up.
              </>,
              <>
                Pick where the client pays: <strong>Tempo mainnet</strong> (real stablecoins) or <strong>Tempo testnet</strong> (test stablecoins), and which stablecoins you accept: any USD stablecoin, or one in particular. Fill in
                the invoice. Click <strong>Use my wallet</strong> to fill your Tempo address from MetaMask, or paste it. Your name and
                address are remembered for next time.
              </>,
              <>
                Click <strong>Seal it on Zcash</strong> and scan the QR with your wallet. Confirm the 0.0001 ZEC payment; the memo is your
                invoice.
              </>,
              <>
                Keep the page open. Within about a minute of the next block, Billet shows the link. If it is slow, paste the transaction
                id from your wallet into the box under the QR and Billet proves that transaction directly.
              </>,
              <>Copy the link and send it to your client by any channel you trust.</>,
            ]}
          />
          <P>
            Every invoice you seal is listed under <strong>Your billets</strong> on the same page, with whether it has been paid, read
            live from Tempo. The list lives in this browser only.
          </P>
          <P>
            Keep the page open while it watches: the watch runs in your browser, not on a server. If you close it, the pending invoice is
            remembered and the watch resumes when you come back.
          </P>

          <H2 id="pay">Paying an invoice</H2>
          <Steps
            items={[
              <>Open the link. The checks run on their own and show the invoice.</>,
              <>
                <strong>Check the Pay to address</strong> against what the sender told you, as you would check bank details on any invoice.
              </>,
              <>
                Click <strong>Pay with a passkey</strong> to pay through Tempo Wallet with Face ID, a fingerprint or your device PIN, with nothing to install. Or choose <strong>Browser wallet</strong> if you use MetaMask. Billet then shows your balance in each accepted coin; pick one and click <strong>Pay</strong>. You approve one transfer. On mainnet the fee is paid in the coin you send; on testnet it is sponsored, and <strong>Get test stablecoins</strong> fills your account from Tempo's faucet.
              </>,
              <>When the transfer confirms, the copy is stamped PAID. Keep the link: it is your receipt.</>,
            ]}
          />

          <H2 id="check">Checking an invoice</H2>
          <P>
            Accountants, auditors and anyone else given a link just open it. Each line of the check is shown as it runs, with links to the
            Zcash transaction and the Tempo payment in public explorers.
          </P>
          <Steps
            items={[
              "The Zcash transaction is fetched from a public light wallet server.",
              "The delivery proof is checked against that transaction's bytes.",
              "The invoice shown is the note's memo, word for word.",
              "Tempo is searched for payments to the invoice's address whose memo is its billet id.",
            ]}
          />

  </>) },
  { slug: "reference", title: "Reference", body: () => (<>
          <H2 id="reference">Reference</H2>
          <H3>Invoice text</H3>
          <P>UTF-8 text, one field per line, in this order, at most 512 bytes. Amounts have one spelling, so each invoice has one id.</P>
          <Pre>{`BILLET/1
from=Ada Okafor
to=Jonas Weber
for=Logo design, October
amount=400 USD
pay=tempo:4217:0x7ADBA972C518D8A489c4c1BA40C310Cb8578894c
token=USD
due=2026-10-20
since=42082271
n=0123456789abcdef`}</Pre>
          <Table
            head={["Field", "Meaning"]}
            rows={[
              [<Code>pay</Code>, "Tempo chain id and the address that receives the payment"],
              [<Code>token</Code>, "USD for any listed USD stablecoin, or one TIP-20 address"],
              [<Code>since</Code>, "Tempo block when the invoice was written; payments are searched from here"],
              [<Code>n</Code>, "Random nonce, so two identical invoices have different ids"],
            ]}
          />
          <H3>Billet id</H3>
          <Pre>{`billetId = keccak256(utf8(invoiceText))   // the Tempo transfer memo, bytes32`}</Pre>
          <H3>Link</H3>
          <Pre>{`https://billet-zec.vercel.app/b#t=<zcash txid>&p=zdp:1:<delivery proof>`}</Pre>
          <P>The part after # is never sent to any server, including Billet's.</P>
          <H3>Networks</H3>
          <Table
            head={["", "Value"]}
            rows={[
              ["Zcash", "Mainnet, Orchard and Ironwood notes"],
              ["Light wallet servers", "zcash-mainnet.chainsafe.dev, zjs.zec.rocks/mainnet (gRPC-web)"],
              ["Tempo", "Mainnet 4217 and Moderato testnet 42431"],
              ["Accepted on mainnet", stablecoins(4217).map((s) => s.symbol).join(", ")],
              ["Accepted on testnet", stablecoins(42431).map((s) => s.symbol).join(", ")],
            ]}
          />

  </>) },
  { slug: "security", title: "Security and limits", body: () => (<>
          <H2 id="security">Security model and limits</H2>
          <ul className="mt-4 list-disc space-y-2.5 pl-5 leading-[1.65] text-ink/85">
            <li>Billet holds no funds and no wallet keys. Payments go directly from payer to payee.</li>
            <li>
              The sealing address's spending key is discarded when it is created. Its viewing key stays in your browser's storage, so
              anyone with access to that browser could read the invoices you sealed there.
            </li>
            <li>The Tempo payment is public: amount, addresses and billet id.</li>
            <li>A delivery proof does not show who sent the note or whether it was later spent.</li>
            <li>Anyone can write a note to your sealing address, so payers must check the pay-to address on the invoice.</li>
            <li>
              The proof library, zcash-delivery-proof, is version 0.1.0 and has not been independently reviewed. Billet itself has not
              been audited.
            </li>
          </ul>

  </>) },
];

const href = (slug: string) => (slug ? `/docs/${slug}` : "/docs");

export function Docs() {
  const { slug = "" } = useParams();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector("[data-active-tab]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [slug]);
  const index = PAGES.findIndex((p) => p.slug === slug);
  if (index < 0) return <Navigate to="/docs" replace />;
  const page = PAGES[index]!;
  const prev = PAGES[index - 1];
  const next = PAGES[index + 1];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <SiteHeader />
        <nav aria-label="Docs pages" className="overflow-x-auto border-t border-rule lg:hidden">
          <ul className="flex w-max gap-1 px-4 py-2 text-[0.88rem]">
            {PAGES.map((p) => (
              <li key={p.slug}>
                <Link
                  to={href(p.slug)}
                  data-active-tab={p.slug === slug ? "" : undefined}
                  className={`block rounded-[3px] px-3 py-1.5 whitespace-nowrap ${p.slug === slug ? "bg-ink font-[650] text-sheet" : "text-sheet-ink hover:text-ink"}`}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-24 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Docs pages" className="sticky top-36">
            <div className="form-label text-sheet-ink">Docs</div>
            <ul className="mt-3 space-y-1.5 text-[0.93rem]">
              {PAGES.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={href(p.slug)}
                    className={`block border-l-2 py-0.5 pl-3 transition-colors ${p.slug === slug ? "border-carbon font-[650] text-carbon" : "border-transparent text-sheet-ink hover:text-ink"}`}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[44rem]">
          {page.body()}
          <nav className="mt-16 grid gap-3 border-t border-rule pt-6 sm:grid-cols-2" aria-label="Previous and next">
            {prev ? (
              <Link to={href(prev.slug)} className="group rounded-[3px] border border-rule p-4 hover:border-carbon">
                <span className="form-label inline-flex items-center gap-1 text-sheet-ink"><ChevronLeft className="h-3.5 w-3.5" /> Previous</span>
                <span className="mt-1 block font-[700] group-hover:text-carbon">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={href(next.slug)} className="group rounded-[3px] border border-rule p-4 text-right hover:border-carbon">
                <span className="form-label inline-flex items-center gap-1 text-sheet-ink">Next <ChevronRight className="h-3.5 w-3.5" /></span>
                <span className="mt-1 block font-[700] group-hover:text-carbon">{next.title}</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
