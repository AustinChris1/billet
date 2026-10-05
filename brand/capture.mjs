// Real captures of the live site used in brand images. Usage: SAMPLE="#t=...&p=..." node brand/capture.mjs
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const sample = process.env.SAMPLE.replace(/^#?/, "#");
const root = join(homedir(), "AppData/Local/ms-playwright");
const dir = readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: join(root, dir, "chrome-headless-shell-win64/chrome-headless-shell.exe") });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await ctx.addInitScript(() => localStorage.setItem("billet.theme", "dark"));
const page = await ctx.newPage();
await page.goto("https://billet.cash/b" + sample, { waitUntil: "networkidle" });
await page.waitForTimeout(9000);
await page.click("summary");
await page.click("text=Make it 100 times bigger");
await page.waitForTimeout(6000);
const card = page.locator("text=Try to fake this invoice").locator("xpath=ancestor::div[contains(@class, \"rounded-[14px]\")][1]");
await card.screenshot({ path: new URL("./src/tamper-dark.png", import.meta.url).pathname.replace(/^\//, "") });
await browser.close();
console.log("captured");
