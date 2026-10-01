import { Plus } from "lucide-react";
import { Link } from "react-router";

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "Who can read my invoice?",
    a: "Anyone you give the link to, and nobody else. The text lives only in an encrypted Zcash note; the link carries a proof that opens that one note. Send the link the way you would send the invoice itself.",
  },
  {
    q: "What is public?",
    a: "The Tempo payment: its amount, both addresses and the billet id (a hash of the invoice text). Billet keeps the words private, not the dollars.",
  },
  {
    q: "Does my client need ZEC or a Zcash wallet?",
    a: "No. They open the link in a browser and pay in OUSD on Tempo from any EVM wallet such as MetaMask. The network fee comes out of the OUSD, so they need nothing else.",
  },
  {
    q: "What do I need to send an invoice?",
    a: "A Zcash wallet that scans payment QR codes (Zodl, formerly Zashi, for example) with a little ZEC: 0.0001 ZEC plus the network fee per invoice. And a Tempo address to be paid at.",
  },
  {
    q: "Does Billet ever hold my money or my keys?",
    a: "No. The payment goes straight from your client to your Tempo address. Billet never asks for your wallet's seed or viewing key. The sealing address it creates has no spending key at all, so even the 0.0001 ZEC sealing note can never move again.",
  },
  {
    q: "What if I clear my browser or lose my laptop?",
    a: "Every link you already sent keeps working forever, because it verifies against the public chain with no key. You only lose the ability to seal new invoices with that sealing address, and Billet makes a new one in a click.",
  },
  {
    q: "How is this different from giving my accountant a viewing key?",
    a: "A viewing key opens your whole account, every past and future payment, and cannot be revoked. A billet link opens one invoice. Give your accountant one link per invoice they need.",
  },
  {
    q: "Could someone fake an invoice from me?",
    a: "Anyone can write a note, so always check the pay-to address on the invoice before paying, as you would with bank details on any invoice. What cannot be faked is the link itself: change one character and the proof or the payment match fails, in the reader's browser.",
  },
  {
    q: "Is it live on mainnet?",
    a: "Yes. Invoices are sealed on Zcash mainnet, and the issuer chooses whether the client pays in real OUSD on Tempo mainnet or in test OUSD on Tempo's testnet; every invoice page says which. Billet is a hackathon build: the proof library it uses (zcash-delivery-proof, v0.1.0) has not been independently reviewed, and Billet itself has not been audited.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.02] font-[780] tracking-[-0.03em]">Questions, answered plainly</h2>
          <p className="mt-4 max-w-[40ch] text-sheet-ink">
            The longer version, with the formats and the checks, is in the{" "}
            <Link to="/docs" className="font-[650] text-carbon underline">
              docs
            </Link>
            .
          </p>
        </div>
        <div className="border-t border-rule">
          {QA.map(({ q, a }) => (
            <details key={q} className="group border-b border-rule">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.08rem] font-[700] hover:text-carbon [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-[62ch] pb-6 leading-relaxed text-sheet-ink">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
