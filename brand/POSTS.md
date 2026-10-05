# Billet posts

Images are in `out/`. Regenerate them with `node brand/build.mjs` (screenshots: `brand/capture.mjs`).

## X: quote Colosseum's Crypto World's Fair post

Attach `out/posts/01-announce-1600x900.png`.

> Building Billet for the @colosseum Crypto World's Fair.
>
> A private invoice, paid in dollars:
> - sealed in one shielded @zcash note
> - paid in any USD stablecoin on @tempo
> - one link proves both, then becomes the receipt
>
> No viewing key. No invoice database.
>
> billet.cash

## X: replies to build a thread under it (optional)

Reply 1, attach `out/posts/02-how-it-works-1600x900.png`:

> How it works: the invoice text goes into the memo of one shielded Zcash note. The client pays on Tempo with a hash of that text as the payment memo. The link carries a proof for that one note, so anyone can check the invoice and the payment match, in their browser.

Reply 2, attach `out/posts/03-try-to-fake-it-1600x900.png`:

> Try to fake one. Open a billet, make the amount 100 times bigger, and every check fails: the text is not the sealed note, the id changes, and no payment carries it.

Reply 3:

> What stays private: the client, the rate and the work. What stays public: the payment, because that is the receipt.
>
> Open source: github.com/AustinChris1/billet

## Zcash Discord

Post in the channel the server uses for community projects; check its rules first.

> Hi all. I'm building Billet for Colosseum's Crypto World's Fair (Zcash and Tempo tracks) and would love Zcash eyes on it.
>
> Billet is a private invoice paid in dollars. The invoice text is sealed as the memo of one shielded note (you send it from your own wallet, Zodl or any ZIP 321 wallet, by scanning a QR). Your client pays in a USD stablecoin on Tempo, with a hash of the invoice as the payment memo. The link you send carries a zcash-delivery-proof for that single note, not a viewing key, so whoever holds it can read that one invoice and nothing else, and checks it against the chain in their browser.
>
> Honest limits: the payment itself is public on Tempo (amount, addresses, the hash). Only the invoice text is private. The proof library is v0.1.0 and not independently reviewed.
>
> What would help most:
> 1. Seal a test invoice: it costs 0.0001 ZEC plus the fee. Choose Tempo testnet when you write it, and paying it is free (there's a faucet button).
> 2. Try to break it. Every billet has a "try to fake this invoice" test.
> 3. Tell me what feels wrong, confusing or unsafe.
>
> App: billet.cash
> Code: github.com/AustinChris1/billet
