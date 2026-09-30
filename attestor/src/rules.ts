import { containerHash } from "@primage/deal";
import { DISCHARGED_EVENT, LOADED_EVENT, type TransportEvent } from "./terminal49.ts";

// Mirrors Primage.Stage.
export const Stage = { None: 0, Open: 1, Loaded: 2, Closed: 3 } as const;

export interface OnChainCredit {
  stage: number;
  attestor: `0x${string}`;
  shipBy: number;
  arriveBy: number;
  containerHash: `0x${string}`;
}

export interface Registration {
  id: `0x${string}`;
  container: string;
  pol: string;
  pod: string;
  containerSalt: string;
}

export type Decision =
  | { action: "attest"; milestone: "loaded" | "arrived"; eventTime: number }
  | { action: "ignore"; reason: string };

/** The whole release policy. Anything that is not an exact match is ignored, never guessed. */
export function decide(
  event: TransportEvent,
  reg: Registration,
  credit: OnChainCredit,
  attestor: `0x${string}`,
  now: number,
): Decision {
  if (credit.attestor.toLowerCase() !== attestor.toLowerCase()) return { action: "ignore", reason: "not our credit" };
  if (event.container !== reg.container) return { action: "ignore", reason: "different container" };
  if (containerHash(reg.containerSalt, reg.container) !== credit.containerHash) {
    return { action: "ignore", reason: "container does not match the hash bound on-chain" };
  }

  const eventTime = Math.floor(Date.parse(event.timestamp) / 1000);
  if (!Number.isFinite(eventTime)) return { action: "ignore", reason: "unreadable event time" };
  if (eventTime > now) return { action: "ignore", reason: "event time is in the future" };

  if (event.event === LOADED_EVENT) {
    if (credit.stage !== Stage.Open) return { action: "ignore", reason: "loading already settled" };
    if (event.locode !== reg.pol) return { action: "ignore", reason: `loaded at ${event.locode}, not ${reg.pol}` };
    if (eventTime > credit.shipBy) return { action: "ignore", reason: "loaded after the latest shipment date" };
    return { action: "attest", milestone: "loaded", eventTime };
  }

  if (event.event === DISCHARGED_EVENT) {
    if (credit.stage !== Stage.Loaded) return { action: "ignore", reason: "not waiting for arrival" };
    if (event.locode !== reg.pod) return { action: "ignore", reason: `discharged at ${event.locode}, not ${reg.pod}` };
    if (eventTime > credit.arriveBy) return { action: "ignore", reason: "arrived after the arrival deadline" };
    return { action: "attest", milestone: "arrived", eventTime };
  }

  return { action: "ignore", reason: `event ${event.event} does not release money` };
}
