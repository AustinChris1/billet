// Renders the gold seal (web/public/icon.svg) into the PNG and ICO icons browsers and services ask for by name.
// Usage: node scripts/icons.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const pub = new URL("../web/public/", import.meta.url);
const svg = readFileSync(new URL("icon.svg", pub), "utf8");

const root = join(homedir(), "AppData/Local/ms-playwright");
const dir = readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: join(root, dir, "chrome-headless-shell-win64/chrome-headless-shell.exe") });

/** pad: share of the canvas left around the seal; bg: null keeps it transparent. */
async function render(size, { pad = 0.04, bg = null } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inset = Math.round(size * pad);
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;background:${bg ?? "transparent"}">` +
      `<div style="position:absolute;inset:${inset}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  const png = await page.screenshot({ omitBackground: !bg });
  await page.close();
  return png;
}

const files = {
  "icon-192.png": await render(192),
  "icon-512.png": await render(512),
  // iOS draws its own rounded mask over a full square, so this one gets a dark ground.
  "apple-touch-icon.png": await render(180, { pad: 0.14, bg: "#141012" }),
};
for (const [name, png] of Object.entries(files)) writeFileSync(new URL(name, pub), png);

// favicon.ico holding PNG images (supported by every current browser).
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await render(s, { pad: 0 }));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync(new URL("favicon.ico", pub), Buffer.concat([header, ...pngs]));

writeFileSync(
  new URL("site.webmanifest", pub),
  JSON.stringify(
    {
      name: "Billet",
      short_name: "Billet",
      description: "Private invoice. Public payment. One link.",
      start_url: "/",
      display: "standalone",
      background_color: "#141012",
      theme_color: "#141012",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
console.log("icons written:", [...Object.keys(files), "favicon.ico", "site.webmanifest"].join(", "));
