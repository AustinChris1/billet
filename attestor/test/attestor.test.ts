import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { containerHash, creditId, encodeTerms, termsHash } from "@primage/deal";
import { decide, Stage, type OnChainCredit } from "../src/rules.ts";
import { createService, HttpError } from "../src/service.ts";
import { Store } from "../src/store.ts";
import { parseTransportEvent, verifySignature } from "../src/terminal49.ts";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url));
const LOADED_RAW = fixture("t49_vessel_loaded.json");
const DISCHARGED_RAW = fixture("t49_vessel_discharged.json");
const SECRET = "whsec_test";
const sign = (raw: Uint8Array) => createHmac("sha256", SECRET).update(raw).digest("hex");

const ATTESTOR = "0x00000000000000000000000000000000000a7e57" as const;
const ESCROW = "0x2222222222222222222222222222222222222222" as const;
const SALT = "0123456789abcdef0123456789abcdef";
const ID = creditId("0x1111111111111111111111111111111111111111", `0x${"ab".repeat(32)}`);

test("Terminal49 signature: accepts the real HMAC, rejects tampering and other secrets", () => {
  assert.ok(verifySignature(LOADED_RAW, sign(LOADED_RAW), SECRET));
  const tampered = new Uint8Array(LOADED_RAW);
  tampered[10] ^= 1;
  assert.ok(!verifySignature(tampered, sign(LOADED_RAW), SECRET));
  assert.ok(!verifySignature(LOADED_RAW, createHmac("sha256", "optional-test-secret").update(LOADED_RAW).digest("hex"), SECRET));
  assert.ok(!verifySignature(LOADED_RAW, undefined, SECRET));
});

test("parses Terminal49's documented vessel_loaded and vessel_discharged payloads", () => {
  const loaded = parseTransportEvent(JSON.parse(LOADED_RAW.toString()))!;
  assert.equal(loaded.event, "container.transport.vessel_loaded");
  assert.equal(loaded.container, "KOCU4221161");
  assert.equal(loaded.locode, "CNNGB");
  assert.equal(loaded.timestamp, "2022-09-22T09:38:00Z");
  assert.equal(loaded.vessel, "NYK THEMIS 0082E");

  const discharged = parseTransportEvent(JSON.parse(DISCHARGED_RAW.toString()))!;
  assert.equal(discharged.container, "NYKU0800893");
  assert.equal(discharged.locode, "USNYC");
  assert.equal(parseTransportEvent({ data: { attributes: { event: "tracking_request.succeeded" } } }), null);
});

const loadedEvent = parseTransportEvent(JSON.parse(LOADED_RAW.toString()))!;
const reg = { id: ID, container: "KOCU4221161", pol: "CNNGB", pod: "USLAX", containerSalt: SALT };
const credit = (over: Partial<OnChainCredit> = {}): OnChainCredit => ({
  stage: Stage.Open,
  attestor: ATTESTOR,
  shipBy: Date.parse("2022-10-01T00:00:00Z") / 1000,
  arriveBy: Date.parse("2022-12-01T00:00:00Z") / 1000,
  containerHash: containerHash(SALT, "KOCU4221161"),
  ...over,
});
const NOW = Date.parse("2022-09-23T00:00:00Z") / 1000;

test("rules: an on-time loading at the named port releases the first tranche", () => {
  const d = decide(loadedEvent, reg, credit(), ATTESTOR, NOW);
  assert.deepEqual(d, { action: "attest", milestone: "loaded", eventTime: Date.parse("2022-09-22T09:38:00Z") / 1000 });
});

test("rules: every mismatch is ignored, never guessed", () => {
  const cases: [string, Parameters<typeof decide>][] = [
    ["wrong port", [loadedEvent, { ...reg, pol: "CNSHA" }, credit(), ATTESTOR, NOW]],
    ["late", [loadedEvent, reg, credit({ shipBy: Date.parse("2022-09-20T00:00:00Z") / 1000 }), ATTESTOR, NOW]],
    ["other attestor", [loadedEvent, reg, credit({ attestor: ESCROW }), ATTESTOR, NOW]],
    ["hash mismatch", [loadedEvent, reg, credit({ containerHash: containerHash(SALT, "NYKU0800893") }), ATTESTOR, NOW]],
    ["already loaded", [loadedEvent, reg, credit({ stage: Stage.Loaded }), ATTESTOR, NOW]],
    ["future", [loadedEvent, reg, credit(), ATTESTOR, Date.parse("2022-09-01T00:00:00Z") / 1000]],
  ];
  for (const [name, args] of cases) assert.equal(decide(...args).action, "ignore", name);
});

function harness() {
  const memo = encodeTerms({
    chainId: 42431,
    escrow: ESCROW,
    id: ID,
    pol: "CNNGB",
    pod: "USLAX",
    containerSalt: SALT,
    ref: "PO-7",
    seller: "Ningbo Sunrise Solar",
    goods: "40 PV panels",
  });
  const onchain = {
    stage: Stage.Open as number,
    attestor: ATTESTOR as `0x${string}`,
    shipBy: Date.parse("2022-10-01T00:00:00Z") / 1000,
    arriveBy: Date.parse("2022-12-01T00:00:00Z") / 1000,
    containerHash: `0x${"0".repeat(64)}` as `0x${string}`,
    termsHash: termsHash(memo),
    supplier: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    buyer: "0x1111111111111111111111111111111111111111" as `0x${string}`,
  };
  const sent: { milestone: string; eventTime: number; evidence: string }[] = [];
  const chain = {
    chainId: 42431 as const,
    address: ATTESTOR as `0x${string}`,
    credit: async () => ({ ...onchain }),
    attest: async (milestone: "loaded" | "arrived", _id: `0x${string}`, eventTime: number, evidence: `0x${string}`) => {
      sent.push({ milestone, eventTime, evidence });
      onchain.stage = milestone === "loaded" ? Stage.Loaded : Stage.Closed;
      return `0x${"f".repeat(64)}` as `0x${string}`;
    },
    bindBySig: async (_id: `0x${string}`, hash: `0x${string}`) => {
      onchain.containerHash = hash;
      return `0x${"e".repeat(64)}` as `0x${string}`;
    },
  };
  const store = new Store(mkdtempSync(join(tmpdir(), "primage-")));
  const confirmed: string[] = [];
  const t49 = {
    createTrackingRequest: async () => "tr_1",
    hasTransportEvent: async (_c: string, te: string) => (confirmed.push(te), true),
  };
  const service = createService({
    cfg: { primage: ESCROW, t49WebhookSecret: SECRET, demoReplay: true },
    chain,
    store,
    t49,
    now: () => NOW,
  });
  return { service, memo, onchain, sent, confirmed };
}

const registerInput = (memo: string) => ({
  memo,
  container: "kocu4221161",
  requestType: "bill_of_lading" as const,
  requestNumber: "HDMUNBOZ32457200",
  scac: "HDMU",
  signature: `0x${"1".repeat(130)}` as `0x${string}`,
});

test("register binds the salted container hash and refuses a forged memo", async () => {
  const h = harness();
  await assert.rejects(h.service.register(ID, registerInput(h.memo.replace("40 PV", "99 PV"))), (e: HttpError) => e.status === 400);
  const r = await h.service.register(ID, registerInput(h.memo));
  assert.ok(r.bindTx);
  assert.equal(h.onchain.containerHash, containerHash(SALT, "KOCU4221161"));
});

test("webhook: signed loading releases once, with evidence = sha256(raw body), and retries are no-ops", async () => {
  const h = harness();
  await h.service.register(ID, registerInput(h.memo));

  await assert.rejects(h.service.webhook(LOADED_RAW, "00"), (e: HttpError) => e.status === 401);

  const first = await h.service.webhook(LOADED_RAW, sign(LOADED_RAW));
  assert.equal(first[0]!.outcome, "attested loaded");
  assert.equal(h.sent.length, 1);
  assert.equal(h.confirmed.length, 1, "event re-checked against the Terminal49 API");
  assert.match(h.sent[0]!.evidence, /^0x[0-9a-f]{64}$/);

  const retry = await h.service.webhook(LOADED_RAW, sign(LOADED_RAW));
  assert.equal(retry[0]!.outcome, "duplicate delivery");
  assert.equal(h.sent.length, 1);

  const st = h.service.status(ID);
  assert.equal(st.attestations.length, 1);
  assert.equal(st.attestations[0]!.replay, 0);
});

test("evidence is only served to someone holding the deal file's container salt", async () => {
  const h = harness();
  await h.service.register(ID, registerInput(h.memo));
  await h.service.webhook(LOADED_RAW, sign(LOADED_RAW));
  const ev = h.sent[0]!.evidence;
  await assert.rejects(h.service.evidence(ID, ev, "f".repeat(32)), (e: HttpError) => e.status === 403);
  const file = await h.service.evidence(ID, ev, SALT);
  assert.deepEqual(new Uint8Array(file), new Uint8Array(LOADED_RAW));
});

test("replay is labelled inside the evidence and walks both milestones", async () => {
  const h = harness();
  await h.service.register(ID, registerInput(h.memo));
  const loaded = await h.service.replay(ID, "loaded", JSON.parse(LOADED_RAW.toString()));
  assert.equal(loaded[0]!.outcome, "attested loaded");
  const arrived = await h.service.replay(ID, "arrived", JSON.parse(DISCHARGED_RAW.toString()));
  assert.equal(arrived[0]!.outcome, "attested arrived");
  assert.equal(h.confirmed.length, 0, "replays never pretend to be Terminal49 events");

  const stored = await h.service.evidence(ID, h.sent[1]!.evidence, SALT);
  assert.match(stored.toString(), /"replay":\{"note":"Recorded Terminal49 payload replayed on testnet/);
  assert.ok(h.service.status(ID).attestations.every((a) => a.replay === 1));
});
