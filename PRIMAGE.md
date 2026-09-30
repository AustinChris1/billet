# Primage

**A letter of credit for businesses that pay suppliers in stablecoins.**

Built on **Tempo** (the money) and **Zcash** (the private deal file).

*Primage* (PRY-mij) is an old shipping term: the payment made to a ship's master for taking care of the cargo. In Primage, the money moves because the cargo was taken care of.

---

## The problem, in one story

A small electronics company orders $20,000 of goods from a factory in another country. The factory says: "Send the money first, then we ship."

So the company sends $20,000 in USDT. Now one of three things happens:

1. The goods ship. Everyone is happy.
2. The goods ship late, or never. The buyer has no way to get the money back.
3. The "supplier" was a scammer. The money is gone.

This happens every day, on every trade route, from Mexico to Turkey to Vietnam. Crypto made the payment fast and cheap. It did nothing to make it **safe**. Once USDT is sent, it is sent.

Banks solved this problem centuries ago with a **letter of credit**: the bank holds the buyer's money and only pays the supplier once there is proof the goods were shipped. But banks charge roughly 0.75% to 2% of the deal, need weeks of paperwork, and turn away a large share of small businesses.

## What Primage does

Primage is a letter of credit that lives on a blockchain instead of inside a bank.

1. **The buyer locks the money.** The USDT goes into a smart contract on Tempo, not to the supplier.
2. **The supplier can see it is really there.** They know the buyer is not bluffing, so they are willing to ship.
3. **The shipping line tells us when the container moves.** Container ships already publish tracking events like "loaded onto vessel" and "discharged at port." Primage listens for them.
4. **The money releases in steps.** For example: 80% when the container is loaded onto the ship, 20% when it arrives.
5. **If nothing ships by the deadline, the buyer gets everything back.** Automatically. Nobody has to approve it.

The money can only ever go two places: to the supplier, or back to the buyer. Not to Primage, not to anyone else. What Primage decides is **when**, based on the shipping line's data. That is the trust you place in us, and we name it plainly below.

It works for any buyer, any supplier, any port, any shipping line that publishes tracking data.

## Where Zcash comes in

Blockchains are public. If a business runs its trade on a public chain, competitors can see who its suppliers are, what it buys, and how much it pays. That alone stops many businesses from using crypto for trade.

Primage splits the deal in two. "Private" here means private from the public: from competitors, customers, and anyone browsing the chain. It does not mean private from Primage, which has to know the deal to run it.

| Public, on Tempo | Private, on Zcash | Who can see the private part |
|---|---|---|
| That a credit exists | Who the supplier is | Buyer, supplier, Primage |
| The amount locked | What was bought | Buyer, supplier, Primage |
| When money was released | The container number | Buyer, supplier, Primage (it has to look it up) |
| A fingerprint (hash) of the terms | The full terms and the shipping evidence | Anyone the buyer or supplier hands the deal key to |

How it works:

- **Every deal gets its own brand-new Zcash account**, created inside the buyer's browser. It holds nothing and is used for nothing else.
- The deal terms are written into a **shielded Zcash note** sent to that account (a private, encrypted message on the Zcash chain, up to 512 bytes). If the buyer has a Zcash wallet, they send it themselves by scanning a QR code. If they do not, Primage sends the note for them. Either way the note lands in an account whose key only the buyer's browser holds.
- The Tempo contract only stores a **fingerprint** of those terms. It refuses to pay out against any other terms, so nobody, including Primage, can quietly change the deal after it is funded.
- The buyer and supplier get the deal's **viewing key**: a read-only key that unlocks this one deal file. They can hand it to an accountant, an auditor, or a lender, and that person sees this deal. Nothing else.
- Each shipping event is also added to the private file, so the viewing key shows the full history.

What the Zcash note adds over a database row: it is timestamped by a public chain, it cannot be edited or deleted by us, and it stays readable by the key holder even if Primage disappears.

### Your keys never leave your device

This is a lesson from ZBooks. ZBooks asked people to paste their treasury viewing key into a website, and the key was decrypted on a server. People would not do it, so they never tried the product. The accounting winner in the same hackathon (Pendrake Watch) did the same job with the key kept on the user's own machine.

Primage fixes both problems:

- **The key is created and used only in your browser.** The deal file is decrypted on your device with ChainSafe's WebZjs library, which has a documented view-only import for exactly this kind of key (`create_account_view_ufvk`) and returns decoded memos. Our server never receives the key.
- **The deal link carries the key after the `#`.** Browsers never send that part of a link to any server. Sharing the link shares the deal, and only the deal.
- **The key only opens one deal.** It is not your wallet key and not your treasury key. Losing it or sharing it exposes one shipment, nothing more.
- **You never paste your own wallet key anywhere.** You only scan a QR code with the wallet you already use.
- **Syncing is fast because the account is new.** The browser only scans blocks from the day the deal was created, through a hosted gRPC-web endpoint. If the in-browser reader fails to start (a known rough edge in WebZjs), a refresh restarts it, and we say so on screen.

To be exact about what "never sees the key" buys you: Primage still knows the terms, because it wrote the fingerprint and runs the release. What it cannot do is read a deal file it did not create, change a sealed deal, or open your other deals.

This is the same read-only viewing-key idea used in ZBooks, done the way Zcash users actually trust.

**What Zcash does NOT hide:** the dollar amount on Tempo is still public. We say so openly.

## Why Tempo

- It is built by Stripe and Paradigm specifically for stablecoin payments.
- Fees are paid in the stablecoin itself, so a supplier never needs to buy a separate gas token.
- Transfers carry a memo field, which fits invoice and order references.
- USDT0 (Tether's cross-chain USDT) is live on it.

## The whole flow, step by step

```
Buyer                          Primage                      Supplier
  |                                |                               |
  |-- enters deal terms (browser creates a one-deal Zcash key)     |
  |-- terms sealed on Zcash (own wallet QR, or Primage sends)   |
  |-- locks USDT on Tempo -------->|   contract stores fingerprint |
  |-- shares deal link (key after #) ----------------------------->|
  |                                |                               |
  |                                |<-- adds container number -----|
  |                                |                               |
  |                  shipping line: "container loaded"             |
  |                                |-- releases 80% -------------->|
  |                                |                               |
  |                  shipping line: "container arrived"            |
  |                                |-- releases 20% -------------->|
  |                                |                               |
  |   (if nothing ships by the deadline: 100% back to buyer)       |
```

## Why this matters (real numbers, global)

Our market is businesses that already pay suppliers in stablecoins and today do it with no protection:

- **Business-to-business is the biggest real use of stablecoins.** About $226 billion of roughly $390 billion in real stablecoin payments in 2025, with the monthly run-rate going from about $5 billion in January 2024 to over $30 billion by early 2026. (McKinsey and Artemis, through secondary reporting)
- **It is small and mid-sized firms paying suppliers.** Artemis describes B2B adoption as concentrated in businesses like auto parts, textiles and manufacturing paying suppliers faster. (secondary reporting)
- **Stablecoins moved about $35 trillion in 2025, but only around 1% was real-world payments.** (CoinDesk, reporting McKinsey and Artemis)
- **Shipping tracking is already standardised.** The nine biggest container lines adopted the DCSA tracking standard and committed to fully electronic bills of lading by 2030. Carriers issue around 45 million bills of lading a year.

Context, not our market: banks leave a **$2.5 trillion** gap in trade finance and reject 41% of small-business applications. The ADB's own explanation is that compliance costs are "often prohibitive" for smaller firms. That is the credit banks refused, not the companies already paying in USDT. It tells you why those companies stopped asking banks. (Asian Development Bank, 2025 survey)

The payment rail exists. The protection layer does not.

## What we are honest about

- **The shipping signal comes from one service we run** (the "attestor"). It reads the carrier's tracking data and signs it. A wrong or dishonest signature would pay the supplier early. It could never send money anywhere else. The next step is cryptographic proof of the carrier's web response (TLSNotary), then several independent attestors.
- **Primage sees every deal it runs.** The attestor needs the container number and the ports to check the tracking data. Privacy is from the public, not from us.
- **Tracking proves a container moved, not what is inside it.** Banks work the same way: a letter of credit pays against documents, not against inspecting the goods.
- **Quality disputes are out of scope** for the hackathon version.
- **Air freight and trucking are not covered yet.** Ocean containers first, because their tracking data is the most standardised.

## Who built it and why

The builder has already shipped each piece separately:

- **Aval**: a letter of credit for AI agents. Money locked to rules, released only on verified evidence.
- **Heirloom**: a trustless switch that releases funds only after an external proof (a Flare Data Connector attestation) is confirmed.
- **Earmark**: payments that can only go to a locked destination. Won Best Stablecoin Adoption at Celo Agents at Work.
- **ZBooks**: Zcash accounting that reads a treasury through a viewing key and never holds spending keys.

Primage joins these into one product for a real market.

## What gets built for the hackathon

- A Tempo smart contract: open a credit, attest a milestone, release, refund.
- The attestor: listens to container tracking webhooks and signs milestones.
- The Zcash part: a one-deal account created in the browser, the terms sealed by a ZIP 321 QR from the buyer's own wallet (or sent by Primage when the buyer has no ZEC), and the deal file decrypted locally with WebZjs. No viewing key ever reaches our server.
- A public sample deal, so a judge can open a real deal file with its key without owning ZEC or trusting us with anything of theirs.
- A web app: create a credit, fund it, watch the timeline, open the private file with a viewing key.
- At least one credit on Tempo mainnet with a small real amount.

## After the hackathon

1. Replace the single attestor with cryptographic proofs and multiple attestors.
2. Let the supplier sell their locked payment to a lender for cash today (turning a credit into financing).
3. Pay suppliers on whichever chain they already hold USDT.
4. Charge a small fee per credit, well below what banks charge.

---

## Sources

- Colosseum Crypto World's Fair: https://colosseum.com/worldsfair
- ADB trade finance gap (via GTR): https://www.gtreview.com/news/global/trade-finance-gap-stabilises-at-us2-5tn/
- CoinDesk, $35T volume and 1% real payments: https://www.coindesk.com/business/2026/01/23/stablecoins-moved-usd35-trillion-last-year-but-only-1-of-it-was-for-real-world-payments
- McKinsey and Artemis stablecoin payments: https://www.mckinsey.com/featured-insights/week-in-charts/stablecoins-find-their-niche
- DCSA electronic bill of lading commitment: https://dcsa.org/get-involved/100-percent-ebl
- Tempo TIP-20 stablecoin standard: https://tempo.xyz/developers/docs/protocol/tip20/overview
- Tempo USDT0 bridging: https://tempo.xyz/developers/docs/guide/bridge-layerzero
- Terminal49 container tracking API: https://terminal49.com/api-pricing
- WebZjs view-only UFVK import (`create_account_view_ufvk`) and memo decoding: https://github.com/ChainSafe/WebZjs/blob/main/crates/webzjs-wallet/src/bindgen/wallet.rs
