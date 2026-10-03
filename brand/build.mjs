// Renders every Billet brand image from HTML. Usage: node brand/build.mjs
// Screenshots in brand/src come from the live site (brand/capture.mjs); nothing here is a mockup.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = new URL("./", import.meta.url);
const out = new URL("./out/", here);
mkdirSync(out, { recursive: true });
const path = (u) => u.pathname.replace(/^\//, "");
const src = (f) => pathToFileURL(path(new URL(`./src/${f}`, here))).href;

const C = { bg: "#141012", band: "#0b0809", ink: "#f4f2ee", muted: "#b6a9ad", zec: "#f3b724", paper: "#f4f2ee", aub: "#231015" };
const seal = readFileSync(new URL("./src/seal.svg", here), "utf8");

const ZEC = `<svg viewBox="0 0 65 65"><circle cx="32.5" cy="32.5" r="32.5" fill="#f3b724"/><path d="M8.591,0V5.146H0v6.2H13.33L0,28.974v4.667H8.591v5.113H13.87V33.641H22.46v-6.2H9.131L22.46,9.813V5.146H13.87V0Z" transform="translate(21 13)" fill="#fff"/></svg>`;
const TEMPO = (fg = C.bg, bg = C.ink) => `<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="${bg}"/><path d="M17.6429 28.1631H13.1933L17.3173 15.4122H12.043L13.1933 11.6748H27.8878L26.7374 15.4122H21.7452L17.6429 28.1631Z" fill="${fg}"/></svg>`;

/** The same line-art burst the site uses for Zcash's side. */
function sunburst({ lines = 110, inner = 150, opacity = 1, ink = C.ink, fade = true } = {}) {
  const rnd = (i) => {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  let s = "";
  for (let i = 0; i < lines; i++) {
    const a = (i / lines) * Math.PI * 2;
    const r0 = inner + rnd(i) * 26;
    const r1 = r0 + 40 + rnd(i + 99) * 110;
    const gold = i % 8 === 0;
    s += `<line x1="${300 + Math.cos(a) * r0}" y1="${300 + Math.sin(a) * r0}" x2="${300 + Math.cos(a) * r1}" y2="${300 + Math.sin(a) * r1}" stroke="${gold ? C.zec : ink}" stroke-opacity="${gold ? 0.9 : 0.16}" stroke-width="${gold ? 1.6 : 1}" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 600 600" style="opacity:${opacity};${fade ? "-webkit-mask-image:linear-gradient(to right,transparent 18%,#000 48%);mask-image:linear-gradient(to right,transparent 18%,#000 48%)" : ""}">${s}</svg>`;
}

const base = (w, h, body, { bg = `radial-gradient(110% 90% at 30% 0%, #261b1f 0%, ${C.bg} 60%)`, transparent = false } = {}) => `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:${transparent ? "transparent" : bg};color:${C.ink};font-family:Geist,system-ui,sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.serif{font-family:Gloock,Georgia,serif;font-weight:400;letter-spacing:-0.015em}
.mono{font-family:"Geist Mono",monospace}
.kicker{font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${C.zec}}
.abs{position:absolute}
.seal svg,.logo svg{width:100%;height:100%;display:block}
.chain{display:inline-flex;align-items:center;gap:12px;color:${C.muted}}
.chain svg{width:30px;height:30px}
.phone{border-radius:46px;padding:11px;background:#2a2225;box-shadow:0 40px 90px -30px #000,0 0 0 1px #ffffff1a}
.phone img{display:block;width:100%;border-radius:36px}
</style></head><body>${body}</body></html>`;

const chains = (size = 30, gap = 34) => `<div style="display:flex;gap:${gap}px;font-size:${Math.round(size * 0.8)}px">
  <span class="chain"><span style="width:${size}px;height:${size}px;display:block">${ZEC}</span>Sealed on Zcash</span>
  <span class="chain"><span style="width:${size}px;height:${size}px;display:block">${TEMPO()}</span>Paid on Tempo</span>
</div>`;

const images = [
  // ---- Logos
  ["logo/billet-mark.png", 1024, 1024, base(1024, 1024, `<div class="seal abs" style="inset:112px">${seal}</div>`, { transparent: true }), { omitBackground: true }],
  ["logo/billet-mark-on-dark.png", 1024, 1024, base(1024, 1024, `<div class="seal abs" style="inset:172px;filter:drop-shadow(0 30px 40px #000a)">${seal}</div>`)],
  ["logo/billet-mark-on-light.png", 1024, 1024, base(1024, 1024, `<div class="seal abs" style="inset:172px;filter:drop-shadow(0 30px 40px #2310153d)">${seal}</div>`, { bg: C.paper })],
  [
    "logo/billet-wordmark-dark.png", 1600, 520,
    base(1600, 520, `<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center;gap:44px"><div class="seal" style="width:300px;height:300px">${seal}</div><div class="serif" style="font-size:230px;line-height:1;color:${C.ink}">Billet</div></div>`, { transparent: true }),
    { omitBackground: true },
  ],
  [
    "logo/billet-wordmark-light.png", 1600, 520,
    base(1600, 520, `<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center;gap:44px"><div class="seal" style="width:300px;height:300px">${seal}</div><div class="serif" style="font-size:230px;line-height:1;color:${C.aub}">Billet</div></div>`, { transparent: true }),
    { omitBackground: true },
  ],

  // ---- X profile
  ["x/x-avatar-400.png", 400, 400, base(400, 400, `<div class="seal abs" style="inset:62px;filter:drop-shadow(0 14px 18px #000a)">${seal}</div>`)],
  [
    "x/x-header-1500x500.png", 1500, 500,
    base(1500, 500, `
      <div class="abs" style="width:900px;height:900px;right:-170px;top:-200px">${sunburst({ inner: 140 })}</div>
      <div class="seal abs" style="width:190px;height:190px;right:255px;top:155px;transform:rotate(-12deg);filter:drop-shadow(0 20px 28px #000b)">${seal}</div>
      <div class="abs" style="left:430px;top:110px;width:640px">
        <div class="serif" style="font-size:66px;line-height:1.02">Private invoice.<br><span style="color:${C.muted}">Public payment.</span><br>One link.</div>
        <div style="margin-top:26px">${chains(26, 26)}</div>
      </div>`),
  ],

  // ---- Link preview (also served by the site as og.png)
  [
    "social/og-1200x630.png", 1200, 630,
    base(1200, 630, `
      <div class="abs" style="width:980px;height:980px;right:-330px;top:-175px">${sunburst()}</div>
      <div class="seal abs" style="width:250px;height:250px;right:160px;top:190px;transform:rotate(-12deg);filter:drop-shadow(0 24px 30px #000b)">${seal}</div>
      <div class="abs" style="left:80px;top:96px;width:640px">
        <div class="kicker" style="font-size:20px">Billet</div>
        <div class="serif" style="font-size:76px;line-height:1.02;margin-top:18px">Private invoice.<br><span style="color:${C.muted}">Public payment.</span><br>One link.</div>
        <div style="font-size:24px;line-height:1.45;color:${C.muted};margin-top:26px;width:560px">The invoice is sealed in one shielded Zcash note and paid in dollars on Tempo. One link proves both.</div>
      </div>
      <div class="abs" style="left:80px;bottom:56px">${chains(28, 30)}</div>`),
  ],

  // ---- Posts (16:9 for X)
  [
    "posts/01-announce-1600x900.png", 1600, 900,
    base(1600, 900, `
      <div class="abs" style="width:1300px;height:1300px;right:-430px;top:-200px">${sunburst({ inner: 160 })}</div>
      <div class="abs" style="left:110px;top:120px;width:820px">
        <div class="kicker" style="font-size:24px">Building for the Crypto World's Fair</div>
        <div class="serif" style="font-size:92px;line-height:1.02;margin-top:24px">Private invoice.<br><span style="color:${C.muted}">Public payment.</span><br>One link.</div>
        <div style="font-size:31px;line-height:1.45;color:${C.muted};margin-top:34px;width:740px">The invoice is sealed in one shielded Zcash note. The client pays in any USD stablecoin on Tempo. The link proves both, then becomes the receipt.</div>
        <div style="margin-top:48px">${chains(34, 36)}</div>
      </div>
      <div class="abs phone" style="width:380px;right:150px;top:70px;transform:rotate(3deg)"><img src="${src("receipt-dark.png")}"></div>`),
  ],
  [
    "posts/02-how-it-works-1600x900.png", 1600, 900,
    base(1600, 900, `
      <div class="abs" style="left:110px;top:100px">
        <div class="kicker" style="font-size:24px">How Billet works</div>
        <div class="serif" style="font-size:78px;line-height:1.04;margin-top:20px">One note, one payment,<br>one link between them.</div>
      </div>
      <svg class="abs" style="left:0;top:0" width="1600" height="900"><path d="M260 509 H1340" stroke="${C.zec}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/></svg>
      ${[
        ["01", `<span style="width:64px;height:64px;display:block">${ZEC}</span>`, "Seal on Zcash", "The invoice text goes into one shielded Zcash note, from the issuer's own wallet."],
        ["02", `<span style="width:64px;height:64px;display:block">${TEMPO()}</span>`, "Pay on Tempo", "The client pays in any USD stablecoin. The payment memo is a hash of the invoice."],
        ["03", `<span class="seal" style="width:70px;height:70px;display:block">${seal}</span>`, "One link proves both", "It carries a proof for that one note, not a viewing key. Anyone can check it."],
      ]
        .map(
          ([, icon, t, b], i) => `<div class="abs" style="left:${110 + i * 465}px;top:440px;width:440px;padding:36px;border-radius:24px;background:#1e181b;border:1px solid #f4f2ee1f">
            ${icon}<div style="font-size:36px;font-weight:600;margin-top:26px">${t}</div><div style="font-size:26px;line-height:1.45;color:${C.muted};margin-top:12px">${b}</div></div>`,
        )
        .join("")}`),
  ],
  [
    "posts/03-try-to-fake-it-1600x900.png", 1600, 900,
    base(1600, 900, `
      <div class="abs" style="left:110px;top:150px;width:640px">
        <div class="kicker" style="font-size:24px">Try to fake one</div>
        <div class="serif" style="font-size:88px;line-height:1.02;margin-top:22px">Make it 100 times bigger. Every check fails.</div>
        <div style="font-size:30px;line-height:1.45;color:${C.muted};margin-top:30px">Edited text is not the sealed Zcash note, its id changes, and no Tempo payment carries that id. Checked live, in the reader's browser.</div>
      </div>
      <img class="abs" src="${src("tamper-dark.png")}" style="width:690px;right:110px;top:115px;border-radius:24px;box-shadow:0 40px 90px -30px #000,0 0 0 1px #ffffff1a">`),
  ],
];

const root = join(homedir(), "AppData/Local/ms-playwright");
const dir = readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: join(root, dir, "chrome-headless-shell-win64/chrome-headless-shell.exe") });
for (const [name, w, h, html, opts = {}] of images) {
  const file = new URL(name, out);
  mkdirSync(new URL("./", file), { recursive: true });
  const tmp = new URL(`./.render.html`, here);
  writeFileSync(tmp, html);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(tmp.href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path(file), omitBackground: !!opts.omitBackground });
  await page.close();
  console.log("rendered", name);
}
await browser.close();
