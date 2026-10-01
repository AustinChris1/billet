// Clicks "Make my sealing address" in a real browser and reports the address WebZjs derived.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const root = join(homedir(), "AppData/Local/ms-playwright");
const dir = existsSync(root) ? readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop() : undefined;
const browser = await chromium.launch({ executablePath: dir ? join(root, dir, "chrome-headless-shell-win64/chrome-headless-shell.exe") : undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e}`));
await page.goto((process.argv[2] ?? "http://localhost:5173") + "/new");
console.log("crossOriginIsolated:", await page.evaluate(() => crossOriginIsolated));
const t0 = Date.now();
await page.getByRole("button", { name: /Make my sealing address/ }).click();
try {
  await page.getByRole("heading", { name: "Write an invoice" }).waitFor({ timeout: 120_000 });
  const issuer = await page.evaluate(() => JSON.parse(localStorage.getItem("billet.issuer.v1") ?? "null"));
  console.log(`issuer ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("address:", issuer.address);
  console.log("viewing key prefix:", issuer.ufvk.slice(0, 12), "length", issuer.ufvk.length);
} catch (e) {
  console.log("FAILED:", String(e).slice(0, 200));
}
await page.screenshot({ path: ".impeccable/review/new-issuer-desktop.png", fullPage: true });
console.log(logs.filter((l) => /error|pageerror/i.test(l)).slice(0, 8).join("\n") || "no console errors");
await browser.close();
