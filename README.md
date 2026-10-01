# Billet

**Private invoice. Public payment. One link.**

Your invoice is sealed in one shielded Zcash note. Your client pays it in OUSD on Tempo. The link you send proves the payment and the invoice are the same, then becomes the receipt. No invoice database. No viewing key.

Built for Colosseum's Crypto World's Fair (Zcash and Tempo tracks).

- **Live app:** https://billet-zec.vercel.app
- **A real billet, sealed on Zcash mainnet and paid on Tempo:** [open it](https://billet-zec.vercel.app/b#t=756a9ae760ee69f0d5f9b77635a5cfb8f313a34e2c395b5f2ee79f786ea2618d&p=zdp:1:jWGibnif5y5fWzksTqMT87jPpTV2t_nV8GnuYOeaanUCAQAb7PC8sZ7Wy11cIen_oAst_mZrjj64XjraDv-kjUCoVpBqE8IfQCQmMIyWECcAAAAAAAAPMY-Mra-uN3vWxN7aRlfLaHPiJLB-2058tr_gTu2BpA). Every check runs in your browser; expand "How this was checked".

---

## The problem

You invoice a client and want to be paid in dollars on-chain. Today you choose between two bad options:

- **Put the invoice where everyone can see it.** A payment memo on a public chain, or a PDF in someone's database. Your client's name, the work and your rate become public or someone else's data.
- **Hand over a Zcash viewing key.** It proves the payment, but it opens your whole account, every past and future payment, forever, and it cannot be revoked. Payment processors that create "a fresh address per invoice" still ask for that key up front.

## What Billet does

1. **Write** the invoice: who, for what, how much, pay where.
2. **Seal** it. Your own Zcash wallet scans one QR and sends the invoice text as a shielded note to a sealing address Billet created in your browser.
3. **Send the link.** It carries a delivery proof for that one note and the transaction id. No key.
4. **Your client opens it.** Their browser fetches the Zcash transaction, checks the proof against its bytes, and shows the invoice word for word. They pay in OUSD on Tempo with one click. The payment's memo is the invoice's id.
5. **The same link becomes the receipt.** It looks up the Tempo payment carrying that id. The PAID stamp only lands once the payment is found on chain.
6. **Come back to it.** Every invoice you sealed is listed in your browser with paid or unpaid read live from Tempo, the total still owed, and one click to invoice the same client again. Links go out by WhatsApp, email or the phone's share sheet.

## How the pieces bind together

| | Where | Who can see it |
|---|---|---|
| Invoice text | Memo of one shielded Zcash note (max 512 bytes) | Anyone holding the link |
| Proof that the text is that note's memo | `zdp:1:` delivery proof in the link | Anyone holding the link; checked against the public chain with no key |
| Billet id | `keccak256` of the exact invoice text | Public, as the Tempo memo |
| Payment | TIP-20 `transferWithMemo(payTo, amount, billetId)` on Tempo | Public |

Change one character of the invoice and its id changes, so the payment no longer matches it.

## What is public, said plainly

- The Tempo payment is an ordinary public transfer: amount, both addresses and the billet id.
- Billet keeps the words private, not the dollars.
- A delivery proof shows the note's value, memo and receiving address. It does not show who sent it or whether it was later spent.
- Anyone you give the link to can read that invoice. Send it like you would send the invoice itself.

## Nothing to lose

- **No wallet in Billet.** The sealing address's spending key is discarded the moment it is made, so the sealing dust (0.0001 ZEC) can never move again. Only its viewing key stays in your browser, to find and prove your own notes.
- **No key in the link.** Links verify against the chain forever. Clearing the browser loses nothing already sent.
- **The payer needs no ZEC.** TIP-20 fees are paid in the token being sent, so OUSD is all they need.

## Zcash and Tempo primitives used

- **ZIP 316** unified viewing key for the sealing address, derived in the browser (ChainSafe WebZjs).
- **ZIP 32** account derivation from a seed that exists for a moment and is wiped.
- **ZIP 321** payment request: the QR the issuer's wallet scans (from SIWZ, `@siwz/core`).
- **Orchard / Ironwood shielded memo** holding the invoice text.
- **Delivery proofs** (`zcash-delivery-proof`): one note disclosed, no viewing key.
- **lightwalletd over gRPC-web**: raw transactions and compact blocks fetched straight from public proxies.
- **TIP-20 `transferWithMemo`** and stablecoin-paid fees on Tempo; **OUSD** (`0x20c0000000000000000000006a37da5c996874be`).

## Status (1 October 2026)

| | Status |
|---|---|
| Delivery proof checked in the browser against Zcash mainnet | Working (`scripts/zdp-mainnet-check.mts`) |
| Sealing watcher and paste-a-txid path | Tested against a real mined transaction (`packages/billet/test/seal.test.ts`) |
| Tempo payment found by billet id | Working on Moderato (`packages/billet/scripts/tempo-pay-check.mts`) |
| Sealing address created in the browser with WebZjs | Working (`scripts/issuer-check.mjs`) |
| First real invoice, end to end | Sealed in an Ironwood note at Zcash mainnet block 3,502,568 from Zodl; paid with `transferWithMemo` on Tempo testnet (tx `0x74d913dc…d0c6`). [Open it](https://billet-zec.vercel.app/b#t=756a9ae760ee69f0d5f9b77635a5cfb8f313a34e2c395b5f2ee79f786ea2618d&p=zdp:1:jWGibnif5y5fWzksTqMT87jPpTV2t_nV8GnuYOeaanUCAQAb7PC8sZ7Wy11cIen_oAst_mZrjj64XjraDv-kjUCoVpBqE8IfQCQmMIyWECcAAAAAAAAPMY-Mra-uN3vWxN7aRlfLaHPiJLB-2058tr_gTu2BpA) |
| Hosted deployment | Live at https://billet-zec.vercel.app, deployed on every push to `main` |

## Repository

```
packages/billet   invoice codec, billet id, links, gRPC-web lightwalletd client, seal watcher, payment check
web               Vite + React app: landing, /new (write and seal), /b (invoice and receipt)
vendor            zcash-delivery-proof WASM (Apache-2.0, unmodified) and a view-only WebZjs build
scripts           mainnet and browser checks, WebZjs static sync
```

### Run it

```sh
pnpm install
pnpm test          # invoice codec, proof library and sealing tests (11)
pnpm dev:web       # http://localhost:5173
```

`web/.env.example` lists the options. `VITE_CHAIN=moderato` makes new invoices payable on Tempo testnet; `tempo` makes them payable on mainnet.

### The view-only WebZjs build

Billet only reads, so it ships a build of WebZjs ([ZcashCommunityGrants/WebZjs](https://github.com/ZcashCommunityGrants/WebZjs), commit in `vendor/webzjs-UPSTREAM_COMMIT`) with the Sapling proving parameters compiled out behind a `prover` feature. The WASM goes from 60 MB to 5 MB. The patch is `vendor/webzjs-view-only.patch`.

## Prior work, disclosed

- **SIWZ** (`@siwz/core`) by the same author: the ZIP 321 builder used for the sealing QR.
- **zcash-delivery-proof** by saplingcash: the proof format and its WebAssembly verifier, vendored unmodified (`vendor/zcash-delivery-proof`, Apache-2.0, see its `NOTICE`). Billet builds the invoice, the link, the sealing flow and the Tempo binding on top of it. The library is version 0.1.0 and not yet independently reviewed.
- Everything else in this repository was written during the hackathon, from 30 September 2026.

## Neighbours

- **zcash-delivery-proof**: the proof Billet uses.
- **zeceipt**: source-of-funds dossiers for shielded ZEC (same hackathon track).
- **CipherPay**: shielded ZEC checkout for merchants; it asks for a viewing key, Billet does not.
