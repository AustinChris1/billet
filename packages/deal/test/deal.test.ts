import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEMO_MAX_BYTES,
  MemoError,
  byteLength,
  containerHash,
  creditId,
  decodeDealFragment,
  decodeEvent,
  decodeTerms,
  encodeDealFragment,
  encodeEvent,
  encodeTerms,
  termsHash,
  type DealTerms,
} from "../src/index.ts";

const terms: DealTerms = {
  chainId: 4217,
  escrow: "0x2222222222222222222222222222222222222222",
  id: "0xb3a1b58be7f186a6b8b251d2505e5a32e888950ad93f4c86bcd21420127854e9",
  pol: "cnngb",
  pod: "USLAX",
  containerSalt: "0123456789abcdef0123456789abcdef",
  ref: "PO-2026-0142",
  seller: "Ningbo Sunrise Solar Co., Ltd.",
  goods: "40 x 550W mono PV panels, 2 pallets",
};

test("creditId matches Solidity keccak256(abi.encode(buyer, salt))", () => {
  // Reference computed with: cast keccak $(cast abi-encode "f(address,bytes32)" 0x1111... $(cast keccak deal-1))
  const id = creditId(
    "0x1111111111111111111111111111111111111111",
    "0xc640f387489d23ce29b93c5e28cef6b5709fddb40b8431d62c956e81fcd15526",
  );
  assert.equal(id, "0xb3a1b58be7f186a6b8b251d2505e5a32e888950ad93f4c86bcd21420127854e9");
});

test("terms memo round-trips and normalises ports", () => {
  const memo = encodeTerms(terms);
  assert.ok(byteLength(memo) <= MEMO_MAX_BYTES);
  const back = decodeTerms(memo);
  assert.equal(back.pol, "CNNGB");
  assert.equal(back.goods, terms.goods);
  assert.equal(encodeTerms(back), memo);
});

test("terms hash is stable for the same memo and changes with one character", () => {
  const memo = encodeTerms(terms);
  assert.equal(termsHash(memo), termsHash(encodeTerms(decodeTerms(memo))));
  assert.notEqual(termsHash(memo), termsHash(memo.replace("40 x", "41 x")));
});

test("decode tolerates Zcash zero padding but rejects edited memos", () => {
  const memo = encodeTerms(terms);
  assert.deepEqual(decodeTerms(memo + "\0\0\0"), decodeTerms(memo));
  assert.throws(() => decodeTerms(memo.replace("pol=CNNGB", "pol=cnngb")), MemoError);
  assert.throws(() => decodeTerms(memo.replace("PRIMAGE/1", "PRIMAGE/2")), MemoError);
});

test("oversized goods text is refused before it reaches a wallet", () => {
  assert.throws(() => encodeTerms({ ...terms, goods: "x".repeat(400) }), /limit is 512/);
});

test("line breaks cannot smuggle extra fields", () => {
  assert.throws(() => encodeTerms({ ...terms, ref: "PO-1\npod=XXXXX" }), MemoError);
});

test("event memo round-trips", () => {
  const memo = encodeEvent({
    id: terms.id,
    milestone: "loaded",
    container: "kocu4221161",
    at: "2026-10-05T09:38:00Z",
    locode: "CNNGB",
    vessel: "NYK THEMIS 0082E",
    source: "shipping_line",
    evidence: "0x" + "ab".repeat(32) as `0x${string}`,
    tx: "0x" + "cd".repeat(32) as `0x${string}`,
  });
  assert.ok(byteLength(memo) <= MEMO_MAX_BYTES);
  const e = decodeEvent(memo);
  assert.equal(e.container, "KOCU4221161");
  assert.equal(e.milestone, "loaded");
});

test("container hash is salted and case-insensitive", () => {
  const a = containerHash(terms.containerSalt, "kocu4221161");
  assert.equal(a, containerHash(terms.containerSalt, " KOCU4221161 "));
  assert.notEqual(a, containerHash("f".repeat(32), "KOCU4221161"));
});

test("deal fragment round-trips and rejects garbage", () => {
  const frag = encodeDealFragment({
    chainId: 4217,
    escrow: terms.escrow,
    id: terms.id,
    birthday: 3_100_000,
    ufvk: "uview1exampleonlyviewingkey",
  });
  assert.ok(frag.startsWith("#"));
  assert.deepEqual(decodeDealFragment(frag)?.birthday, 3_100_000);
  assert.equal(decodeDealFragment("#k=zxviews1spendingish&c=1"), null);
});
