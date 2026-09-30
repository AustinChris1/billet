import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  numberToHex,
  zeroAddress,
  type EIP1193Provider,
  type Hex,
  type WalletClient,
} from "viem";
import { Abis } from "viem/tempo";
import { primageAbi } from "@primage/deal";
import { chain, FEE_MANAGER, PATH_USD, primageAddress } from "./config.ts";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const publicClient = createPublicClient({ chain, transport: http() });

export const Stage = { None: 0, Open: 1, Loaded: 2, Closed: 3 } as const;

export interface Credit {
  buyer: Hex;
  supplier: Hex;
  attestor: Hex;
  token: Hex;
  amount: bigint;
  settled: bigint;
  loadedBps: number;
  shipBy: number;
  arriveBy: number;
  stage: number;
  termsHash: Hex;
  containerHash: Hex;
}

export async function readCredit(id: Hex): Promise<Credit | null> {
  const c = await publicClient.readContract({ address: primageAddress, abi: primageAbi, functionName: "credit", args: [id] });
  if (Number(c.stage) === Stage.None) return null;
  return {
    buyer: c.buyer,
    supplier: c.supplier,
    attestor: c.attestor,
    token: c.token,
    amount: c.amount,
    settled: c.settled,
    loadedBps: Number(c.loadedBps),
    shipBy: Number(c.shipBy),
    arriveBy: Number(c.arriveBy),
    stage: Number(c.stage),
    termsHash: c.termsHash,
    containerHash: c.containerHash,
  };
}

export interface CreditEvent {
  name: string;
  tx: Hex;
  block: bigint;
  args: Record<string, unknown>;
}

export async function creditEvents(id: Hex): Promise<CreditEvent[]> {
  const logs = await publicClient.getContractEvents({
    address: primageAddress,
    abi: primageAbi,
    args: { id } as never,
    fromBlock: "earliest",
  });
  return logs
    .filter((l) => (l.args as { id?: Hex }).id?.toLowerCase() === id.toLowerCase())
    .map((l) => ({ name: l.eventName, tx: l.transactionHash, block: l.blockNumber, args: l.args as Record<string, unknown> }));
}

export function tokenBalance(token: Hex, owner: Hex) {
  return publicClient.readContract({ address: token, abi: Abis.tip20, functionName: "balanceOf", args: [owner] });
}

/** Which stablecoin a plain wallet transaction pays its fee in: the user's FeeManager choice, else pathUSD. */
export async function feeToken(owner: Hex): Promise<Hex> {
  const t = await publicClient.readContract({ address: FEE_MANAGER, abi: Abis.feeManager, functionName: "userTokens", args: [owner] });
  return t === zeroAddress ? PATH_USD : t;
}

export interface Connected {
  address: Hex;
  wallet: WalletClient;
}

export async function connect(): Promise<Connected> {
  const provider = window.ethereum;
  if (!provider) throw new Error("No browser wallet found. Install MetaMask or another EVM wallet.");
  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as Hex[];
  if (!address) throw new Error("Wallet returned no account.");
  await ensureChain(provider);
  return { address, wallet: createWalletClient({ account: address, chain, transport: custom(provider) }) };
}

async function ensureChain(provider: EIP1193Provider) {
  const hexId = numberToHex(chain.id);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err) {
    if ((err as { code?: number }).code !== 4902) throw err;
    // MetaMask insists on 18 decimals for the display currency; Tempo has no native token, so it is cosmetic.
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: chain.name,
          nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
          rpcUrls: [...chain.rpcUrls.default.http],
          blockExplorerUrls: [chain.blockExplorers.default.url],
        },
      ],
    });
  }
}

async function confirm(hash: Hex) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return hash;
}

export async function setFeeToken(c: Connected, token: Hex) {
  return confirm(
    await c.wallet.writeContract({ account: c.address, chain, address: FEE_MANAGER, abi: Abis.feeManager, functionName: "setUserToken", args: [token] }),
  );
}

export async function approve(c: Connected, token: Hex, amount: bigint) {
  const current = await publicClient.readContract({ address: token, abi: Abis.tip20, functionName: "allowance", args: [c.address, primageAddress] });
  if (current >= amount) return null;
  return confirm(
    await c.wallet.writeContract({ account: c.address, chain, address: token, abi: Abis.tip20, functionName: "approve", args: [primageAddress, amount] }),
  );
}

export interface OpenTerms {
  supplier: Hex;
  attestor: Hex;
  token: Hex;
  amount: bigint;
  loadedBps: number;
  shipBy: number;
  arriveBy: number;
  termsHash: Hex;
}

export async function openCredit(c: Connected, salt: Hex, t: OpenTerms) {
  return confirm(
    await c.wallet.writeContract({
      account: c.address,
      chain,
      address: primageAddress,
      abi: primageAbi,
      functionName: "open",
      args: [salt, t],
    }),
  );
}

export async function signContainerBinding(c: Connected, id: Hex, containerHash: Hex): Promise<Hex> {
  return c.wallet.signTypedData({
    account: c.address,
    domain: { name: "Primage", version: "1", chainId: chain.id, verifyingContract: primageAddress },
    types: { BindContainer: [{ name: "id", type: "bytes32" }, { name: "containerHash", type: "bytes32" }] },
    primaryType: "BindContainer",
    message: { id, containerHash },
  });
}

export async function settle(c: Connected, action: "release" | "decline" | "refund", id: Hex) {
  return confirm(
    await c.wallet.writeContract({ account: c.address, chain, address: primageAddress, abi: primageAbi, functionName: action, args: [id] }),
  );
}
