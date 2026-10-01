---
version: 1
slug: "web-src"
primary_target: "web/src"
related_targets: []
---

# Billet: landing, invoice/receipt page, issue flow, docs

Scope: the landing (/, Persuade), the billet page (/b, one invoice that is also its receipt; Operate inside a Persuade frame for judges), the issue flow (/new) and docs (/docs, Read) all share this world.
Audience and job: a payer checks an invoice and pays it in any accepted USD stablecoin on Tempo; an issuer seals an invoice on Zcash and shares a link; a judge opens a sample link and sees one invoice.
Proof on hand: a real delivery proof verified in the browser against Zcash mainnet; a real Tempo TransferWithMemo whose memo is the billet id; real screenshots of the running app.
Constraints: no fabricated users or claims; say what is public (Tempo payment) and what is private (invoice text). Light and dark mode both first-class (user, 2026-10-01). Zcash's real yellow, not a pale canary (user, 2026-10-01).

## Direction contract

THESIS: Billet is the wire between Zcash's private side and Tempo's public side; refuses the pale paper-invoice costume and the neon crypto dashboard.
OWN-WORLD: Warm paper (#F4F2EE) or aubergine-black (#141012) ground, aubergine ink, Zcash yellow #F3B724 as the one committed accent (fills, the wire, verified ticks; gold-ink for text on light). Zcash side drawn as line-art sunbursts, Tempo side as grey wireframe rings. Gold wax seal mark. High-contrast display serif headlines, a clean grotesk for UI, a mono only for ids and hashes. Dark aubergine bands for story sections in light mode.
STORY: The visitor sees a real billet checked live inside the art, understands one link opens one sealed note and matches one public payment, scrolls the four steps along the wire, and writes an invoice.
FIRST VIEWPORT: Left: serif headline "Private invoice. Public payment. One link.", one paragraph, yellow primary "Write an invoice" plus "Open the live billet". Right: animated sunburst behind the live billet card, Tempo rings orbiting, a gold seal on the card corner. Header: seal mark, nav with icons, theme toggle.
FORM: z.cash and tempo.xyz read as one system ("Shielded Ledger"), position 6 of my ordered list, seed key f754bb59. Raises: one SVG wire with travelling current lit only when a step is true (from Kraftwerk Man-Machine); scroll-pinned planes moving at separate speeds for the how-it-works story (from Multiplane Dawn).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
