// Screenshots of the real pages at desktop and phone width; also reports console errors. Usage: node scripts/shots.mjs [baseUrl]
import { mkdirSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const out = new URL("../.impeccable/review/", import.meta.url);
mkdirSync(out, { recursive: true });

// Use whichever headless shell is already installed rather than downloading the pinned revision.
function shell() {
  const root = join(homedir(), "AppData/Local/ms-playwright");
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
  return dir ? join(root, dir, "chrome-headless-shell-win64/chrome-headless-shell.exe") : undefined;
}

const pages = [
  ["landing", "/"],
  ["new", "/new"],
  ["docs", "/docs"],
  ["billet-empty", "/b"],
  [
    "billet-notbillet",
    "/b#t=6ef95d7ee48af136d33196e510712b916a6d15498f75c1154814ebf77fd87b59&p=zdp:1:WXvYf_frFEgVwXWPSRVtapErcRDlljHTNvGK5H5d-W4CAADxmRh1VsecY8DmWr_q_tgANvb0jq3j1RgadHLEZyn5ZatN3aoO7fCrw0wdECcAAAAAAABCBHYMP_cPDLK8l-ADNQ-by718ii6Z5IwVxCO_g0Mgbg",
  ],
  ...(process.env.SAMPLE ? [["billet-sample", `/b${process.env.SAMPLE}`]] : []),
];

const browser = await chromium.launch({ executablePath: shell() });
for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const theme = process.env.THEME ?? "light";
  await ctx.addInitScript((t) => localStorage.setItem("billet.theme", t), theme);
  for (const [name, path] of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(name.startsWith("billet") ? 6000 : 1200);
    await page.screenshot({ path: new URL(`${name}-${tag}${process.env.THEME ? "-" + process.env.THEME : ""}.png`, out).pathname.replace(/^\//, ""), fullPage: true });
    console.log(`${tag} ${name}: ${errors.length ? errors.join(" | ").slice(0, 300) : "no console errors"}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
