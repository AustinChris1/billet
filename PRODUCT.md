# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who pays a stranger in stablecoins for something physical that a courier or shipping line carries. Two sides, weighted equally in the app:

- **Buyers**: people and small businesses paying for goods in USDT (P2P sellers in crypto communities, online merchants, importers paying overseas factories). They open and fund the credit.
- **Sellers**: whoever ships the goods. They see the money is locked before shipping, then register the tracking number.

Also: hackathon judges (Colosseum Crypto World's Fair, Tempo and Zcash tracks) evaluating the product from the landing page and a sample deal.

## Product Purpose

A letter of credit for stablecoin payments. The buyer locks dollars on Tempo; the money moves to the seller in two steps when the carrier's own tracking data says the item was dispatched and then delivered, or goes back to the buyer if nothing ships in time. The private terms of the deal live in one shielded Zcash note, readable only with a one-deal viewing key. Success: two strangers can trade a physical item for stablecoins without either one having to trust the other.

## Positioning

Money that only ever has two possible destinations (seller or buyer), released by tracking events neither party controls, with the deal terms private from the public but provable to anyone the parties choose. Existing stablecoin rails move money fast but offer no protection; bank letters of credit protect but are slow, costly and closed to small deals.

## Operating Context

- Parcels: courier tracking via 17TRACK (3,300+ carriers, HMAC-signed webhooks). Milestones: dispatched, delivered.
- Ocean containers: carrier events via Terminal49 (HMAC-signed webhooks). Milestones: vessel loaded at the port of loading, discharged at the port of discharge.
- Money: TIP-20 stablecoins on Tempo (USDT0 on mainnet; AlphaUSD/pathUSD on the Moderato testnet). Every movement carries the credit id as its TIP-20 memo.
- Deal file: a text memo (max 512 bytes) in a shielded Zcash note, sent to a fresh account whose seed is discarded in the browser; read back in the browser with ChainSafe WebZjs (view-only). Deal links carry the viewing key after `#`.
- Buyers and sellers use ordinary EVM wallets (MetaMask) and, optionally, any Zcash wallet that scans ZIP 321 QR codes.

## Capabilities and Constraints

- Contract: open, bind tracking (seller, or seller signature relayed), attest dispatched/loaded, attest delivered/arrived, buyer release, seller decline, refund to buyer after deadline plus 3 day grace. Deployed on Moderato; mainnet pending.
- The attestor is one service run by Primage. A wrong attestation can pay the seller early; it can never send money anywhere else. Next step: TLSNotary proofs, then several attestors.
- Primage sees every deal it runs (it needs the tracking number). Privacy is from the public, not from Primage.
- The dollar amount on Tempo is public.
- Tracking proves an item moved, not what is inside. Quality disputes are out of scope.
- Zcash keys never touch a Primage server.
- Undecided: fee model (a small per-credit fee is the plan, amount not set).

## Brand Commitments

- Name: Primage (PRY-mij), the old payment to a ship's master for care of the cargo.
- Voice: mixed by surface. Plain, exact trade language for buyers and sellers ("credit", "latest shipment date", "tranche"); protocol detail (escrow, attestor, viewing key, ZIPs) in a how-it-works layer for judges.
- No em-dashes or en-dashes in any copy. Must not look like a generic AI landing page.
- Every hackathon project gets a unique, meaning-rooted logo (user's standing rule).

## Evidence on Hand

- Live testnet contract: Moderato `0x2b173855793810094961565e84080bd814F78557`; a full open, bind and loading attestation ran against real TIP-20 (80 of 100 AlphaUSD released with the credit id as memo).
- Tests: 22 contract tests incl. a 512-run fuzz invariant (funds only reach buyer or seller), deal codec and attestor suites.
- No customers, quotes, testimonials, logos or user counts exist. Never fabricate them. Demand evidence, if any, comes from conversations the founder runs in crypto communities before submission.
- Market data allowed (sourced): McKinsey/Artemis real stablecoin payments ~$390B in 2025, B2B ~$226B; ADB trade finance gap $2.5T (context only).

## Product Principles

1. The money has exactly two exits. Every screen should make that obvious.
2. Show the proof, not the promise: tx hashes, memos, evidence hashes, a real sample deal.
3. Private from the public, honest about who sees what.
4. Nothing to install and nothing to paste: links and QR codes, keys stay in the browser.
5. Works for a $50 parcel and a $50,000 container with the same rules.
