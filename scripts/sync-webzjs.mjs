// WebZjs's thread-pool workers import each other, which Vite cannot bundle, so the package ships as static ES modules.
import { cpSync, rmSync } from "node:fs";

const from = new URL("../vendor/webzjs-wallet/", import.meta.url);
const to = new URL("../web/public/webzjs/", import.meta.url);
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true, filter: (p) => !p.endsWith("package.json") });
console.log("webzjs copied to web/public/webzjs");
