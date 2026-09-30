import { tempo, tempoModerato } from "viem/chains";

const env = import.meta.env;

export const chain = env.VITE_CHAIN === "tempo" ? tempo : tempoModerato;
export const isTestnet = chain.id !== tempo.id;
export const primageAddress = (env.VITE_PRIMAGE_ADDRESS ?? "") as `0x${string}`;
export const attestorUrl = (env.VITE_ATTESTOR_URL ?? "http://localhost:8787").replace(/\/$/, "");
export const attestorAddress = (env.VITE_ATTESTOR_ADDRESS ?? "") as `0x${string}`;
export const explorer = chain.blockExplorers.default.url;

export const lightwalletdProxies: string[] = (
  env.VITE_LIGHTWALLETD ?? "https://zcash-mainnet.chainsafe.dev,https://zjs.zec.rocks/mainnet"
)
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

export interface Stablecoin {
  symbol: string;
  address: `0x${string}`;
}

// TIP-20 tokens always have 6 decimals.
export const stablecoins: Stablecoin[] = isTestnet
  ? [
      { symbol: "AlphaUSD", address: "0x20c0000000000000000000000000000000000001" },
      { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000" },
    ]
  : [
      { symbol: "USDT0", address: "0x20c00000000000000000000014f22ca97301eb73" },
      { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000" },
    ];

export const PATH_USD = "0x20c0000000000000000000000000000000000000" as const;
export const FEE_MANAGER = "0xfeec000000000000000000000000000000000000" as const;

/** Value of the sealing note in ZEC. The deal account has no spending key, so this dust is never moved again. */
export const SEAL_AMOUNT_ZEC = "0.0001";
