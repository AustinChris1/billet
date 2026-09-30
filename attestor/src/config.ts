import { isAddress, isHex } from "viem";

export interface Config {
  chain: "tempo" | "moderato";
  rpcUrl: string | undefined;
  primage: `0x${string}`;
  attestorKey: `0x${string}`;
  feeToken: `0x${string}`;
  t49ApiKey: string | undefined;
  t49WebhookSecret: string | undefined;
  port: number;
  dataDir: string;
  webOrigin: string;
  demoReplay: boolean;
}

const PATH_USD = "0x20c0000000000000000000000000000000000000";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set (see attestor/.env.example)`);
  return v;
}

export function loadConfig(): Config {
  const chain = (process.env.CHAIN ?? "moderato").trim();
  if (chain !== "tempo" && chain !== "moderato") throw new Error("CHAIN must be tempo or moderato");

  const primage = required("PRIMAGE_ADDRESS");
  const attestorKey = required("ATTESTOR_KEY");
  const feeToken = process.env.FEE_TOKEN?.trim() || PATH_USD;
  if (!isAddress(primage) || !isAddress(feeToken)) throw new Error("PRIMAGE_ADDRESS and FEE_TOKEN must be addresses");
  if (!isHex(attestorKey) || attestorKey.length !== 66) throw new Error("ATTESTOR_KEY must be a 32-byte hex key");

  const demoReplay = process.env.DEMO_REPLAY === "1";
  if (demoReplay && chain === "tempo") throw new Error("DEMO_REPLAY is testnet only");

  return {
    chain,
    rpcUrl: process.env.TEMPO_RPC_URL?.trim() || undefined,
    primage,
    attestorKey,
    feeToken,
    t49ApiKey: process.env.T49_API_KEY?.trim() || undefined,
    t49WebhookSecret: process.env.T49_WEBHOOK_SECRET?.trim() || undefined,
    port: Number(process.env.PORT ?? 8787),
    dataDir: process.env.DATA_DIR?.trim() || "./data",
    webOrigin: process.env.WEB_ORIGIN?.trim() || "http://localhost:5173",
    demoReplay,
  };
}
