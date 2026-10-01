import { createPublicClient, createWalletClient, custom, http, numberToHex, type Chain, type EIP1193Provider, type Hex } from "viem";
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
