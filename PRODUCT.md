# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two sides, weighted equally:

- **Issuers**: freelancers, contractors and small businesses who invoice clients and want to be paid in dollars on Tempo, without the client's name and the work description ending up public or in someone else's database.
- **Payers**: the client who opens the invoice link, checks it, and pays in OUSD (or another USD stablecoin) on Tempo from an ordinary wallet.

Also: anyone the issuer or payer hands the link to (an accountant, an auditor), and hackathon judges (Colosseum Crypto World's Fair, Zcash and Tempo tracks) who open sample links.

## Product Purpose

Billet is a private dollar invoice. The invoice text (who, for what, how much, pay where) is sealed in one shielded Zcash note. The client pays OUSD on Tempo with the invoice's id as the transfer memo. One link is both the invoice and the receipt: it carries a delivery proof of that one note, checks it against the chain in the browser, then shows whether the Tempo payment with that id has arrived. Success: an invoice that is verifiable, payable in one click, and shows nothing to anyone without the link.

## Positioning

The link carries a proof, not a key. A viewing key opens a whole account forever and cannot be revoked; a delivery proof opens exactly one note. Payment processors such as CipherPay ask the merchant for a viewing key; Billet never holds one from the user. The Tempo payment is bound to the private invoice because its memo is the keccak256 of the invoice text.

## Operating Context

- Sealing: the issuer's own Zcash wallet (Zodl, formerly Zashi, or any ZIP 321 wallet) scans a QR and sends a tiny shielded note to a receive-only address Billet created in the browser. The seed is discarded; the dust is never spent.
- Proofs: zcash-delivery-proof (saplingcash, Apache-2.0, v0.1.0, not yet independently reviewed), WASM in the browser; raw transactions fetched over gRPC-web from public lightwalletd proxies.
- Payment: TIP-20 `transferWithMemo` on Tempo; OUSD at `0x20c0000000000000000000006a37da5c996874be` (mainnet and Moderato). Fees are paid in the token itself.
- Issuer address creation: ChainSafe WebZjs (view-only build, 5 MB) in the browser.

## Capabilities and Constraints

- The OUSD amount, the payer and payee addresses and the memo hash are public on Tempo. Only the invoice text is private.
- The issuer needs a little ZEC once per invoice (about 0.0001 ZEC plus the network fee) to seal it. The payer never needs ZEC.
- A delivery proof shows the note's value, memo and receiver; it does not show who sent it or whether it was spent.
- Losing the browser loses nothing already shared: links verify against the chain with no key.
- Anyone holding a link can read that invoice; links are shared deliberately.
- Undecided: business model (hosted watcher, paid tier) and a ZEC pay path for the client.

## Brand Commitments

- Name: Billet (a short official note; also the ticket that assigns one soldier to one billet: one note, one place).
- Voice: mixed by surface. Plain invoice language for issuers and payers; protocol detail (ZIP 321, delivery proofs, TIP-20 memos) in a how-it-works layer for judges.
- No em-dashes or en-dashes anywhere. Must not look like a generic AI landing page.
- Every hackathon project gets a unique, meaning-rooted logo.

## Evidence on Hand

- Working mainnet pipeline: a real Ironwood transaction fetched over gRPC-web from both public proxies and its delivery proof checked in WASM; tampered proofs rejected.
- No users, customers, quotes or testimonials. Never fabricate them.
- Neighbours to acknowledge, not hide: zcash-delivery-proof (the library Billet uses), zeceipt (source-of-funds dossiers, same hackathon track), CipherPay (shielded ZEC checkout).

## Product Principles

1. A link opens one invoice and nothing else.
2. Show the check, not a badge: every claim on screen is verified in the browser against the chain.
3. Say plainly what is public (the Tempo payment) and what is private (the invoice).
4. Nothing to paste, nothing to install for the payer.
5. Nothing to lose: no wallet in Billet, no key in the link.
