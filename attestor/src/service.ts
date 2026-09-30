import { containerHash, decodeTerms, evidenceHash, isContainerNumber, termsHash } from "@primage/deal";
import type { Hex } from "viem";
import type { Chain } from "./chain.ts";
import type { Config } from "./config.ts";
import { decide, Stage } from "./rules.ts";
import type { Store } from "./store.ts";
import {
  DISCHARGED_EVENT,
  LOADED_EVENT,
  parseTransportEvent,
  verifySignature,
  type RequestType,
  type Terminal49,
} from "./terminal49.ts";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface RegisterInput {
  memo: string;
  container: string;
  requestType: RequestType;
  requestNumber: string;
  scac: string;
  signature?: Hex;
}

export interface Deps {
  cfg: Pick<Config, "primage" | "t49WebhookSecret" | "demoReplay">;
  chain: Pick<Chain, "chainId" | "address" | "credit" | "attest" | "bindBySig">;
  store: Store;
  t49: Pick<Terminal49, "createTrackingRequest" | "hasTransportEvent"> | undefined;
  now?: () => number;
}

const REQUEST_TYPES = new Set(["bill_of_lading", "booking_number", "container"]);

export function createService(deps: Deps) {
  const { cfg, chain, store, t49 } = deps;
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  let queue: Promise<unknown> = Promise.resolve();
  // Webhooks and replays run one at a time so a retried delivery cannot race its original.
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  async function register(id: Hex, input: RegisterInput) {
    if (!/^0x[0-9a-f]{64}$/.test(id)) throw new HttpError(400, "bad credit id");
    const container = input.container?.trim().toUpperCase() ?? "";
    if (!isContainerNumber(container)) throw new HttpError(400, "container number should look like KOCU4221161");
    if (!REQUEST_TYPES.has(input.requestType)) throw new HttpError(400, "unknown tracking request type");
    if (!input.requestNumber?.trim() || !/^[A-Z]{4}$/.test(input.scac?.trim().toUpperCase() ?? "")) {
      throw new HttpError(400, "a tracking number and a 4-letter carrier SCAC are required");
    }

    const credit = await chain.credit(id);
    if (credit.stage !== Stage.Open) throw new HttpError(409, "credit is not open");
    if (credit.attestor.toLowerCase() !== chain.address.toLowerCase()) {
      throw new HttpError(403, "this credit names a different attestor");
    }

    let terms;
    try {
      terms = decodeTerms(input.memo);
    } catch (err) {
      throw new HttpError(400, `terms memo: ${(err as Error).message}`);
    }
    if (termsHash(input.memo) !== credit.termsHash) throw new HttpError(400, "memo does not match the terms hash on Tempo");
    if (terms.id !== id || terms.escrow !== cfg.primage.toLowerCase() || terms.chainId !== chain.chainId) {
      throw new HttpError(400, "memo belongs to a different credit");
    }

    const hash = containerHash(terms.containerSalt, container);
    let bindTx: Hex | undefined;
    if (/^0x0{64}$/.test(credit.containerHash)) {
      if (!input.signature) throw new HttpError(400, "supplier signature required to bind the container");
      bindTx = await chain.bindBySig(id, hash, input.signature);
    } else if (credit.containerHash !== hash) {
      throw new HttpError(409, "a different container is already bound to this credit");
    }

    const trackingId = t49
      ? await t49.createTrackingRequest(input.requestType, input.requestNumber.trim(), input.scac.trim().toUpperCase())
      : null;

    store.saveRegistration({
      id,
      container,
      pol: terms.pol,
      pod: terms.pod,
      containerSalt: terms.containerSalt,
      memo: input.memo,
      requestType: input.requestType,
      requestNumber: input.requestNumber.trim(),
      scac: input.scac.trim().toUpperCase(),
      trackingId,
      createdAt: now(),
    });
    return { bindTx, tracking: trackingId ? "requested" : "not configured" };
  }

  async function processEvent(raw: Uint8Array, payload: unknown, replay: boolean) {
    const ev = parseTransportEvent(payload);
    if (!ev) return [{ outcome: "ignored", reason: "not a container transport event" }];
    const results: { id: string; outcome: string; reason?: string; tx?: Hex }[] = [];

    for (const reg of store.registrationsForContainer(ev.container)) {
      const credit = await chain.credit(reg.id);
      const d = decide(ev, reg, credit, chain.address, now());
      if (d.action === "ignore") {
        results.push({ id: reg.id, outcome: "ignored", reason: d.reason });
        continue;
      }
      if (!replay && t49 && !(await t49.hasTransportEvent(ev.containerId, ev.transportEventId))) {
        results.push({ id: reg.id, outcome: "ignored", reason: "event not found in our Terminal49 account" });
        continue;
      }
      const evidence = evidenceHash(raw);
      store.saveEvidence(evidence, raw);
      const tx = await chain.attest(d.milestone, reg.id, d.eventTime, evidence);
      store.saveAttestation({
        id: reg.id,
        milestone: d.milestone,
        tx,
        evidence,
        eventTime: d.eventTime,
        replay: replay ? 1 : 0,
        createdAt: now(),
      });
      results.push({ id: reg.id, outcome: `attested ${d.milestone}`, tx });
    }
    if (results.length === 0) results.push({ id: "", outcome: "ignored", reason: "no credit tracks this container" });
    return results;
  }

  async function webhook(raw: Uint8Array, signature: string | undefined) {
    if (!cfg.t49WebhookSecret) throw new HttpError(503, "webhook secret not configured");
    if (!verifySignature(raw, signature, cfg.t49WebhookSecret)) throw new HttpError(401, "bad signature");
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      throw new HttpError(400, "body is not JSON");
    }
    const notificationId = (payload as { data?: { id?: string } }).data?.id ?? "";
    return serial(async () => {
      if (notificationId && !store.markNotification(notificationId, "received")) {
        return [{ outcome: "duplicate delivery" }];
      }
      return processEvent(raw, payload, false);
    });
  }

  /** Testnet only: re-emits a recorded carrier payload for this credit, and says so inside the evidence. */
  async function replay(id: Hex, milestone: "loaded" | "arrived", template: unknown) {
    if (!cfg.demoReplay) throw new HttpError(404, "replay is disabled");
    const reg = store.registration(id);
    if (!reg) throw new HttpError(404, "credit is not registered");
    const body = structuredClone(template) as {
      replay?: unknown;
      data: { id: string; attributes: { event: string } };
      included: { type: string; attributes: Record<string, unknown> }[];
    };
    const event = milestone === "loaded" ? LOADED_EVENT : DISCHARGED_EVENT;
    const at = new Date((now() - 60) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    body.replay = { note: "Recorded Terminal49 payload replayed on testnet with this credit's container and port", at };
    body.data.id = `replay-${id.slice(2, 10)}-${milestone}`;
    body.data.attributes.event = event;
    for (const r of body.included) {
      if (r.type === "container") r.attributes.number = reg.container;
      if (r.type === "transport_event") {
        r.attributes.event = event;
        r.attributes.timestamp = at;
        r.attributes.location_locode = milestone === "loaded" ? reg.pol : reg.pod;
      }
    }
    const raw = new TextEncoder().encode(JSON.stringify(body));
    return serial(() => processEvent(raw, body, true));
  }

  function status(id: Hex) {
    const reg = store.registration(id);
    return {
      registered: Boolean(reg),
      tracking: reg ? (reg.trackingId ? "requested" : "not configured") : null,
      attestations: store.attestations(id),
    };
  }

  /** Evidence reveals the container, so only someone holding the deal file's salt may read it. */
  async function evidence(id: Hex, hash: string, salt: string) {
    const reg = store.registration(id);
    const file = store.evidence(hash);
    if (!reg || !file || !store.attestations(id).some((a) => a.evidence === hash)) throw new HttpError(404, "not found");
    const credit = await chain.credit(id);
    if (containerHash(salt, reg.container) !== credit.containerHash) throw new HttpError(403, "deal file required");
    return file;
  }

  return { register, webhook, replay, status, evidence };
}
