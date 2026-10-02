import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, numberToHex, type Chain, type EIP1193Provider, type Hex } from "viem";
import { Abis } from "viem/tempo";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export async function connectWallet(chain: Chain): Promise<{ address: Hex; provider: EIP1193Provider }> {
  const provider = window.ethereum;
  if (!provider) throw new Error("No browser wallet found. Install MetaMask or another EVM wallet to pay.");
  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as Hex[];
  if (!address) throw new Error("The wallet returned no account.");
  const chainId = numberToHex(chain.id);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (err) {
    if ((err as { code?: number }).code !== 4902) throw err;
    // MetaMask requires 18 decimals for the display currency; Tempo has no native token, so it is cosmetic.
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: chain.name,
          nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
          rpcUrls: [...chain.rpcUrls.default.http],
          blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
        },
      ],
    });
  }
  return { address, provider };
}

export function tokenBalance(chain: Chain, token: Hex, owner: Hex) {
  return createPublicClient({ chain, transport: http() }).readContract({
    address: token,
    abi: Abis.tip20,
    functionName: "balanceOf",
    args: [owner],
  });
}

/** Testnet only: Tempo's faucet sends the address 1,000,000 of each test stablecoin, OUSD included. */
export async function fundFromFaucet(chain: Chain, address: Hex) {
  if (!chain.testnet) throw new Error("The faucet only exists on Tempo testnet.");
  await createPublicClient({ chain, transport: http() }).request({ method: "tempo_fundAddress" as never, params: [address] as never });
}

/** TIP-20 transferWithMemo: the fee comes out of the token being sent, so the payer needs nothing else. */
export async function payWithMemo(chain: Chain, token: Hex, to: Hex, amount: bigint, memo: Hex): Promise<Hex> {
  const { address, provider } = await connectWallet(chain);
  const wallet = createWalletClient({ account: address, chain, transport: custom(provider) });
  const hash = await wallet.writeContract({
    account: address,
    chain,
    address: token,
    abi: Abis.tip20,
    functionName: "transferWithMemo",
    args: [to, amount, memo],
  });
  const receipt = await createPublicClient({ chain, transport: http() }).waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`The payment reverted: ${hash}`);
  return hash;
}

// ---- Tempo Wallet: a passkey account (Face ID, fingerprint), no extension to install.

/** Tempo's public fee payer for its testnet. Mainnet sponsorship needs an API key, so there the fee comes out of the coin sent. */
const TESTNET_SPONSOR = "https://sponsor.moderato.tempo.xyz";

const passkeyProviders = new Map<number, Promise<AccountsProvider>>();

function passkeyProvider(chain: Chain): Promise<AccountsProvider> {
  let p = passkeyProviders.get(chain.id);
  if (!p) {
    // Loaded on demand, so readers who never pay do not download the wallet SDK.
    p = import("accounts").then(({ Provider, tempoWallet }) =>
      Provider.create({
        adapter: tempoWallet(),
        chains: [chain],
        feePayer: chain.testnet ? TESTNET_SPONSOR : undefined,
      }),
    );
    passkeyProviders.set(chain.id, p);
  }
  return p;
}

type AccountsProvider = { request: (args: { method: string; params?: unknown }) => Promise<unknown> };

export type PayMethod = "passkey" | "browser";
export type Payer = { method: PayMethod; address: Hex };

/** Whether this invoice's fees are sponsored when paid with a passkey. */
export const passkeySponsored = (chain: Chain) => chain.testnet === true;

export function hasBrowserWallet() {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectPayer(chain: Chain, method: PayMethod): Promise<Payer> {
  if (method === "browser") {
    const { address } = await connectWallet(chain);
    return { method, address };
  }
  const provider = await passkeyProvider(chain);
  const res = (await provider.request({ method: "wallet_connect" })) as { accounts: ({ address: Hex } | Hex)[] };
  const first = res.accounts[0];
  const address = typeof first === "string" ? first : first?.address;
  if (!address) throw new Error("Tempo Wallet returned no account.");
  return { method, address };
}

/** One Tempo transaction holding one call: transferWithMemo, memo = billet id. */
export async function payAs(payer: Payer, chain: Chain, token: Hex, to: Hex, amount: bigint, memo: Hex): Promise<Hex> {
  if (payer.method === "browser") return payWithMemo(chain, token, to, amount, memo);
  const provider = await passkeyProvider(chain);
  const data = encodeFunctionData({ abi: Abis.tip20, functionName: "transferWithMemo", args: [to, amount, memo] });
  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: payer.address, calls: [{ to: token, data }], ...(passkeySponsored(chain) ? { feePayer: true } : {}) }],
  })) as Hex;
  const receipt = await createPublicClient({ chain, transport: http() }).waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`The payment reverted: ${hash}`);
  return hash;
}

/**
 * What a payer must hold on top of the invoice when the fee comes out of the coin sent.
 * A transferWithMemo used about 283k gas on Tempo; gas is priced in attodollars (18 decimals),
 * TIP-20 amounts in 6, so the fee in token units is gas x price / 1e12. Doubled for headroom.
 */
export async function feeHeadroom(chain: Chain): Promise<bigint> {
  const price = await createPublicClient({ chain, transport: http() }).getGasPrice();
  const units = (300_000n * price * 2n) / 10n ** 12n;
  return units > 1_000n ? units : 1_000n;
}

/** True when this payer pays the network fee out of the invoice coin. */
export const paysOwnFee = (payer: Payer, chain: Chain) => !(payer.method === "passkey" && passkeySponsored(chain));
