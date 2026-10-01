# Primage

**A letter of credit for anyone who pays in stablecoins for something that gets shipped.**

Built on **Tempo** (the money) and **Zcash** (the private deal file).

*Primage* (PRY-mij) is an old shipping term: the payment made to a ship's master for taking care of the cargo. In Primage, the money moves because the cargo was taken care of.

Hackathon: Colosseum Crypto World's Fair, deadline 12 October 2026. Chains on the form: Tempo and Zcash.

---

## The problem

You find a seller online. They want USDT first, then they will ship. You send it. Then one of three things happens:

1. The item ships. Fine.
2. It ships late, or never. You cannot get the money back.
3. The seller was a scammer. The money is gone.

This is the same whether it is a $300 phone from someone in a Telegram group or a $20,000 container from a factory. Stablecoins made the payment fast and cheap. Nothing made it safe. Once USDT is sent, it is sent.

Banks solved this centuries ago with a **letter of credit**: the bank holds the buyer's money and pays the seller only when there is proof the goods shipped. But it costs roughly 0.75% to 2%, takes weeks, and is closed to small deals and to people without a bank relationship.

## What Primage does

1. **The buyer locks the money** in a contract on Tempo. It does not go to the seller yet.
2. **The seller can see it is really there**, so they are willing to ship.
3. **The seller registers the tracking number.**
4. **The courier's own tracking data moves the money**, in two steps. Example: 80% when the carrier scans the parcel as picked up (or the container is loaded on the ship), 20% when it is delivered (or discharged at the destination port).
5. **If nothing ships by the deadline, the buyer gets everything back.** Anyone can trigger the refund.

The money can only ever go two places: to the seller, or back to the buyer. Not to Primage, not to anyone else.

Two tracking sources, one set of rules:

| | Parcels | Ocean containers |
|---|---|---|
| Who | People and small businesses buying goods for USDT | Importers paying factories |
| Tracking data | 17TRACK (3,300+ couriers) | Terminal49 (shipping lines) |
| Step 1 releases on | Picked up by the courier | Loaded on the vessel at the port of loading |
| Step 2 releases on | Delivered | Discharged at the port of discharge |

## Where Zcash comes in

A public chain would show everyone who you buy from, what, and for how much. So the deal is split:

| Public (Tempo) | Private (Zcash) |
|---|---|
| A credit exists, the amount, when money moved | Who the seller is, what was bought, the tracking number, addresses |
| A fingerprint (hash) of the terms | The full terms and the shipping evidence |

- Every deal gets a **brand-new Zcash account created in the buyer's browser**. The browser makes a random seed, derives a read-only **viewing key**, then wipes the seed. Nobody, not even the buyer, can ever spend from that account.
- The terms are written into a **shielded Zcash note** (a private encrypted message, up to 512 bytes) sent to that account, by scanning a QR code with any Zcash wallet.
- The Tempo contract stores only a fingerprint of the terms and will not pay against any other terms.
- The deal link carries the viewing key after the `#`, which browsers never send to a server. Whoever holds the link (seller, accountant, auditor, lender) can read that one deal. Nobody else can.

**Lesson from ZBooks:** ZBooks lost at ZecHub because judges would not paste a treasury viewing key into a website that decrypted it on a server. Primage never receives a key. The deal file is decrypted in the browser with ChainSafe's WebZjs, and the key only opens one deal.

**Honest limits:** the dollar amount on Tempo is public. Primage itself sees every deal it runs (it needs the tracking number to watch it); privacy is from the public, not from us.

## Zcash primitives used

- **ZIP 316**: unified viewing key for the one-deal account.
- **ZIP 32**: deriving that account from a seed that exists for a moment in the browser.
- **ZIP 321**: the QR code the buyer's own wallet scans to seal the terms (from the SIWZ library the founder already shipped).
- **Orchard shielded memo**: holds the terms as text.

## Why Tempo

Built by Stripe and Paradigm for stablecoin payments. Fees are paid in stablecoins, so nobody needs a gas token. Every TIP-20 transfer carries a 32-byte memo: every dollar that moves in Primage is tagged with the credit id.

## What is built (as of 30 September)

- **Contract** (`contracts/`): open, bind shipment, attest dispatched, attest delivered, buyer release, seller decline, refund. 22 tests including a 512-run fuzz test proving money only ever ends up with the buyer or the seller.
- **Live on Tempo testnet** (Moderato) with a real end-to-end run against Tempo's actual stablecoin precompile: 100 AlphaUSD locked, 80 released to the seller on the attestation, tagged with the credit id as the memo.
- **Deal codec** (`packages/deal/`): the private terms memo, hashes, deal links. Credit id cross-checked against Solidity.
- **Attestor** (`attestor/`): receives signed Terminal49 webhooks, re-checks each event against Terminal49's API, releases money only on an exact match (right shipment, right place, before the deadline). Evidence is the hash of the raw carrier data. 17TRACK adapter next.
- **WebZjs view-only build** (`vendor/`): patched the official wallet so a read-only build drops the proving parameters. Download went from 60 MB to 5 MB.
- **Not built yet:** 17TRACK adapter, the web app screens, logo, mainnet deploy, demo video.

## What we are honest about

- **The attestor is one service we run.** A wrong signature can pay the seller early; it can never send money anywhere else. Next: cryptographic proof of the courier's web response (TLSNotary), then several attestors.
- **Tracking proves an item moved, not what is inside.** Banks work the same way: a letter of credit pays against documents, not against inspecting goods.
- **No demand evidence yet.** No customers, quotes or users. The founder has no importer network; validation would come from crypto communities where people buy goods for USDT.
- **Frequency is the weak point.** Most people do not pay strangers for shipped goods every week. This is a real concern for a startup competition that asks "would people use this regularly?"

## Why this matters (sourced)

- Real stablecoin payments were about $390 billion in 2025; business-to-business about $226 billion of that (McKinsey and Artemis, via secondary reporting).
- Stablecoins moved about $35 trillion in 2025, but only around 1% was real-world payments (CoinDesk).
- Context: banks leave a $2.5 trillion trade finance gap and reject 41% of small-business applications (Asian Development Bank, 2025). That is credit banks refused, not our market.

## Sources

- Colosseum Crypto World's Fair: https://colosseum.com/worldsfair
- CoinDesk, $35T volume and 1% real payments: https://www.coindesk.com/business/2026/01/23/stablecoins-moved-usd35-trillion-last-year-but-only-1-of-it-was-for-real-world-payments
- McKinsey and Artemis: https://www.mckinsey.com/featured-insights/week-in-charts/stablecoins-find-their-niche
- ADB trade finance gap (via GTR): https://www.gtreview.com/news/global/trade-finance-gap-stabilises-at-us2-5tn/
- Tempo TIP-20: https://tempo.xyz/developers/docs/protocol/tip20/overview
- 17TRACK API: https://api.17track.net/en/doc
- Terminal49 API: https://github.com/Terminal49/API
- WebZjs view-only import (`create_account_view_ufvk`): https://github.com/ZcashCommunityGrants/WebZjs
