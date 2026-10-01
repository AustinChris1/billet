// USD stablecoins an invoice written as "token=USD" accepts. Each was checked on chain: TIP-20, 6 decimals, currency() == "USD".
// The list is versioned with the code, so a receipt is always checked against the same set it was paid under.
export interface Stablecoin {
  symbol: string;
  address: `0x${string}`;
}

const MAINNET: Stablecoin[] = [
  { symbol: "OUSD", address: "0x20c0000000000000000000006a37da5c996874be" },
  { symbol: "USDT0", address: "0x20c00000000000000000000014f22ca97301eb73" },
  { symbol: "USDC.e", address: "0x20c000000000000000000000b9537d11c60e8b50" },
  { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000" },
];

const MODERATO: Stablecoin[] = [
  { symbol: "OUSD", address: "0x20c0000000000000000000006a37da5c996874be" },
  { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000" },
  { symbol: "AlphaUSD", address: "0x20c0000000000000000000000000000000000001" },
  { symbol: "BetaUSD", address: "0x20c0000000000000000000000000000000000002" },
  { symbol: "ThetaUSD", address: "0x20c0000000000000000000000000000000000003" },
];

const BY_CHAIN: Record<number, Stablecoin[]> = { 4217: MAINNET, 42431: MODERATO };

export function stablecoins(chainId: number): Stablecoin[] {
  return BY_CHAIN[chainId] ?? [];
}

/** The tokens an invoice can be paid in: every listed USD stablecoin for "USD", else the one it names. */
export function acceptedTokens(chainId: number, token: `0x${string}` | "USD"): Stablecoin[] {
  if (token !== "USD") {
    const known = stablecoins(chainId).find((s) => s.address.toLowerCase() === token.toLowerCase());
    return [known ?? { symbol: "token", address: token }];
  }
  return stablecoins(chainId);
}

export function symbolOf(chainId: number, address: string): string {
  return stablecoins(chainId).find((s) => s.address.toLowerCase() === address.toLowerCase())?.symbol ?? "token";
}
