// WebZjs's thread-pool workers import each other, which Vite cannot bundle, so the package ships as static ES modules.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../vendor/webzjs-wallet/", import.meta.url));
const to = fileURLToPath(new URL("../web/public/webzjs/", import.meta.url));
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true, filter: (p) => !p.endsWith("package.json") });

// The worker snippets import the package folder and rely on a bundler to find its entry; a static server needs the file.
let patched = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) {
      const src = readFileSync(p, "utf8");
      const out = src.replace(/(from\s*|import\()(["'])((?:\.\.\/)*\.\.\/?)\2/g, (_m, kw, q, rel) => {
        patched++;
        return `${kw}${q}${rel.replace(/\/?$/, "/")}webzjs_wallet.js${q}`;
      });
      if (out !== src) writeFileSync(p, out);
    }
  }
};
walk(join(to, "snippets"));
console.log(`webzjs copied to web/public/webzjs (${patched} worker imports pointed at webzjs_wallet.js)`);
