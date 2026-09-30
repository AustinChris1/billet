import { readFileSync, writeFileSync } from "node:fs";

const { abi } = JSON.parse(readFileSync("contracts/out/Primage.sol/Primage.json", "utf8"));
const out = `// Generated from contracts/out/Primage.sol/Primage.json by scripts/abi.mjs. Do not edit.\nexport const primageAbi = ${JSON.stringify(abi, null, 2)} as const;\n`;
writeFileSync("packages/deal/src/abi.ts", out);
console.log(`wrote ${abi.length} ABI entries`);
