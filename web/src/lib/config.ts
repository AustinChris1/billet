import { tempo, tempoModerato } from "viem/chains";
import type { Chain } from "viem";

const env = import.meta.env;

/** Which Tempo network new invoices are written for. Opening an invoice follows the chain id inside it. */
export const issueChain: Chain = env.VITE_CHAIN === "tempo" ? tempo : tempoModerato;

export function chainById(id: number): Chain | undefined {
  return [tempo, tempoModerato].find((c) => c.id === id);
}

export const OUSD = "0x20c0000000000000000000006a37da5c996874be" as const;

export const lightwalletdProxies: string[] = (
  env.VITE_LIGHTWALLETD ?? "https://zcash-mainnet.chainsafe.dev,https://zjs.zec.rocks/mainnet"
)
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

/** Value of the sealing note. The issuer address has no spending key, so this dust is never moved again. */
export const SEAL_AMOUNT_ZEC = "0.0001";

export const zcashExplorer = (txid: string) => `https://mainnet.zcashexplorer.app/transactions/${txid}`;
export const tempoExplorer = (chain: Chain, tx: string) => `${chain.blockExplorers?.default.url}/tx/${tx}`;
