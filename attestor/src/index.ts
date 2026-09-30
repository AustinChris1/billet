import { readFileSync } from "node:fs";
import { createChain } from "./chain.ts";
import { loadConfig } from "./config.ts";
import { startServer } from "./server.ts";
import { createService } from "./service.ts";
import { Store } from "./store.ts";
import { Terminal49 } from "./terminal49.ts";

const cfg = loadConfig();
const chain = createChain(cfg);
const store = new Store(cfg.dataDir);
const t49 = cfg.t49ApiKey ? new Terminal49(cfg.t49ApiKey) : undefined;
const service = createService({ cfg, chain, store, t49 });

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const replayTemplates = cfg.demoReplay
  ? { loaded: fixture("t49_vessel_loaded.json"), arrived: fixture("t49_vessel_discharged.json") }
  : {};

startServer(service, { port: cfg.port, webOrigin: cfg.webOrigin, replayTemplates });
console.log(
  `attestor ${chain.address} on ${cfg.chain} (chain ${chain.chainId}), escrow ${cfg.primage}, port ${cfg.port}` +
    `${t49 ? "" : ", Terminal49 not configured"}${cfg.demoReplay ? ", DEMO REPLAY ON" : ""}`,
);
