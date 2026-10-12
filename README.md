# Billet

**Private invoice. Public payment. One link.**

Billet lets you send an invoice and get paid in dollars on a blockchain without the details of the job becoming public. The words of the invoice (who, what work, the terms) are kept private on Zcash. Your client pays in a US dollar stablecoin on Tempo. One link holds it all together: it shows the invoice, proves it is genuine, and turns into the receipt once the payment arrives.

- **Live app:** https://billet.cash
- **See a real one:** [an invoice sealed on Zcash mainnet and paid $10 on Tempo mainnet](https://billet.cash/b#3JxIxn8DyZB5sCu_FXO5hB9u1n6Z1b5zA0GINGQgpxcCAQAb7PC8sZ7Wy11cIen_oAst_mZrjj64XjraDv-kjUCoVpBqE8IfQCQmMIyWECcAAAAAAACaMZU03qTIae9TEhf87dhy3Mfx6wQT7AbKn4YVWUNdhw)
- **Docs:** https://billet.cash/docs

Built by Austin Chris for Colosseum's Crypto World's Fair (Zcash and Tempo tracks).

---

## The problem

Say you are a freelancer and your client pays you in dollars on a blockchain. That payment is public. If you want to show which invoice it paid, you have two bad choices:

- **Make the invoice public too**, for example by writing it into the payment. Now anyone can read your client's name, the work and your rate.
- **Share a Zcash viewing key** so someone can check it privately. But a viewing key shows your whole account: every past and future payment, forever. You cannot take it back, and anyone you give it to can leak it.

Billet is a third option: prove one invoice, and nothing else.

## How it works, in four steps

1. **Write the invoice** at billet.cash/new: who it is for, the work, the amount, where to be paid.
2. **Seal it.** Your own Zcash wallet scans a QR code and sends the invoice text in one tiny private transaction. That costs about 0.00001 ZEC plus the network fee.
3. **Send the link** to your client by WhatsApp, email or anything else. The link carries a proof for that one transaction. It carries no key.
4. **Your client opens it and pays.** Their browser checks the proof against the Zcash blockchain, shows the invoice word for word, and lets them pay on Tempo with a passkey (fingerprint or Face ID) or a browser wallet such as MetaMask. They need no ZEC and nothing to install. The moment the payment is found on Tempo, the same link shows **PAID** and becomes the receipt.

Billet also keeps a list in your browser of every invoice you sealed, showing paid or unpaid live from Tempo, so you can follow up or bill the same client again.

## Try it as a judge (2 minutes)

1. Open the [real mainnet invoice](https://billet.cash/b#3JxIxn8DyZB5sCu_FXO5hB9u1n6Z1b5zA0GINGQgpxcCAQAb7PC8sZ7Wy11cIen_oAst_mZrjj64XjraDv-kjUCoVpBqE8IfQCQmMIyWECcAAAAAAACaMZU03qTIae9TEhf87dhy3Mfx6wQT7AbKn4YVWUNdhw). Your browser fetches the Zcash transaction and the Tempo payment and checks both itself. No Billet server is involved.
2. Expand **Checks and tamper test**. Change a word or the amount and watch the payment stop matching.
3. To write your own, go to https://billet.cash/new. Sealing needs a Zcash wallet that can scan a payment QR, such as Zodl (formerly Zashi), with a little shielded ZEC. You can choose Tempo testnet to pay with free test dollars.

## Why it needs both chains

- **Zcash keeps the words private.** The invoice text lives inside one shielded Zcash note. Only people holding the link can read it.
- **Tempo makes the payment the receipt.** The client pays in a dollar stablecoin, and the payment's memo is a fingerprint (hash) of the invoice text. Change one character of the invoice and the fingerprint changes, so the payment no longer matches.

Neither chain can do this alone: Zcash has the privacy, Tempo has the dollar payments with memos and low fees.

## What is private and what is public

| | Who can see it |
|---|---|
| The invoice text (names, work, terms, amount) | Only people you give the link to |
| The payment: amount, both addresses, the invoice fingerprint | Everyone, on Tempo |
| Your other Zcash transactions | Nobody. The link proves one note and opens nothing else |

To be clear about the limits:

- Billet keeps the **words** private, not the dollars. The Tempo payment is an ordinary public transfer.
- The proof shows the sealed note's value, text and receiving address. It does not show who sent it or whether it was spent later.
- Anyone you give the link to can read that invoice. Share it as you would share the invoice itself.

## Nothing to lose

- **No wallet inside Billet.** The sealing address is created in your browser and its spending key is thrown away at once, so the tiny sealing amount can never move. Only its viewing key stays in your browser, to find your own invoices.
- **No key in the link.** Links check against the blockchains forever. Clearing your browser loses nothing you have already sent.
- **No Billet database.** There is no server holding your invoices.

## Words used here

- **Stablecoin:** a token worth one US dollar. Billet accepts OUSD, USDT0, USDC.e and pathUSD on Tempo mainnet.
- **Tempo:** a blockchain built for stablecoin payments. Fees are paid in the coin being sent, under a cent.
- **Zcash shielded note:** a private Zcash transaction. Its amount, parties and attached text are encrypted.
- **Viewing key:** a Zcash key that reveals every transaction of an account. Billet never asks for one.
- **Delivery proof:** a proof about one shielded note that anyone can check against the public chain with no key.

---

## Technical details

### How the pieces bind together

| | Where | Who can see it |
|---|---|---|
| Invoice text | Memo of one shielded Zcash note (max 512 bytes) | Anyone holding the link |
| Proof that the text is that note's memo | `zdp:1:` delivery proof in the link | Anyone holding the link; checked against the chain with no key |
| Billet id | `keccak256` of the exact invoice text | Public, as the Tempo memo |
| Payment | TIP-20 `transferWithMemo(payTo, amount, billetId)` on Tempo | Public |

### Zcash and Tempo primitives used

- **ZIP 316** unified viewing key for the sealing address, derived in the browser (ChainSafe WebZjs).
- **ZIP 32** account derivation from a seed that exists for a moment and is wiped.
- **ZIP 321** payment request: the QR the issuer's wallet scans (`packages/billet/src/zip321.ts`).
- **Orchard / Ironwood shielded memo** holding the invoice text.
- **Delivery proofs** (`zcash-delivery-proof`): one note disclosed, no viewing key.
- **lightwalletd over gRPC-web**: raw transactions and compact blocks fetched straight from public proxies.
- **TIP-20 `transferWithMemo`** with stablecoin-paid fees on Tempo. Invoices can name one token or accept any listed USD stablecoin (`packages/billet/src/tokens.ts`; each was checked on chain to be TIP-20, 6 decimals, `currency() == "USD"`).
- **Tempo Accounts SDK** passkey wallet for paying with a fingerprint or Face ID.

### What is working (12 October 2026)

| | Status |
|---|---|
| First mainnet invoice, end to end | Sealed from Zodl on an Android phone in an Ironwood note at Zcash mainnet block 3,505,343; paid $10.00 in OUSD on Tempo mainnet with a Tempo Wallet passkey ([tx](https://explore.tempo.xyz/tx/0x9cd63eefb383abc3b8256d865c7d3ed2f1a9773867ec5205172a2e8d42f206e6)) |
| First invoice, testnet payment | Sealed at Zcash mainnet block 3,502,568 from Zodl; paid with `transferWithMemo` on Tempo testnet ([open it](https://billet.cash/b#jWGibnif5y5fWzksTqMT87jPpTV2t_nV8GnuYOeaanUCAQAb7PC8sZ7Wy11cIen_oAst_mZrjj64XjraDv-kjUCoVpBqE8IfQCQmMIyWECcAAAAAAAAPMY-Mra-uN3vWxN7aRlfLaHPiJLB-2058tr_gTu2BpA)) |
| Delivery proof checked in the browser against Zcash mainnet | Working (`scripts/zdp-mainnet-check.mts`) |
| Sealing address created in the browser with WebZjs | Working (`scripts/issuer-check.mjs`) |
| Seal watcher and paste-a-transaction-id fallback | Tested against a real mined transaction (`packages/billet/test/seal.test.ts`) |
| Tempo payment found by billet id | Working on Tempo mainnet and Moderato testnet |
| Pay with a passkey or a browser wallet, in any accepted USD stablecoin | Working |
| Invoice list with live paid or unpaid status | Working, stored only in the issuer's browser |
| Tests | 13 passing (`pnpm test`) |
| Hosting | https://billet.cash, deployed on every push to `main` (billet-zec.vercel.app still serves older links) |

### Repository

```
packages/billet   invoice codec, billet id, links, stablecoin list, gRPC-web lightwalletd client, seal watcher, payment check
web               Vite + React app: landing, /new (write and seal), /b (invoice and receipt), /docs
vendor            zcash-delivery-proof WASM (Apache-2.0, unmodified) and a view-only WebZjs build
scripts           mainnet and browser checks, WebZjs static sync, icons
brand             logo, social images and the scripts that render them
```

### Run it locally

You need Node.js 22 or newer and pnpm.

```sh
pnpm install
pnpm test          # invoice codec, proof library and sealing tests
pnpm dev:web       # http://localhost:5173
```

`web/.env.example` lists the options. `VITE_CHAIN=moderato` makes new invoices payable on Tempo testnet by default; `tempo` makes them payable on mainnet. Issuers can switch per invoice.

### The view-only WebZjs build

Billet only reads from Zcash, so it ships a build of WebZjs ([ZcashCommunityGrants/WebZjs](https://github.com/ZcashCommunityGrants/WebZjs), commit in `vendor/webzjs-UPSTREAM_COMMIT`) with the Sapling proving parameters compiled out behind a `prover` feature. The WASM goes from 60 MB to 5 MB. The patch is `vendor/webzjs-view-only.patch`.

## Prior work, disclosed

- **zcash-delivery-proof** by saplingcash: the proof format and its WebAssembly verifier, vendored unmodified (`vendor/zcash-delivery-proof`, Apache-2.0, see its `NOTICE`). Billet builds the invoice, the link, the sealing flow and the Tempo binding on top of it. The library is version 0.1.0 and not yet independently reviewed.
- **ChainSafe WebZjs**, used through the view-only build described above.
- Everything else in this repository was written during the hackathon, from 30 September 2026.

## Related projects

- **zcash-delivery-proof**: the proof Billet uses.
- **zeceipt**: source-of-funds reports for shielded ZEC (same hackathon track).
- **CipherPay**: shielded ZEC checkout for merchants. It asks the merchant for a viewing key; Billet does not.
