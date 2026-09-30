import { encodeAbiParameters, keccak256, sha256, stringToBytes, toHex } from "viem";

/** Mirrors Primage.creditId: keccak256(abi.encode(buyer, salt)). */
export function creditId(buyer: `0x${string}`, salt: `0x${string}`): `0x${string}` {
  return keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [buyer, salt]));
}

/** The on-chain termsHash commits to the exact UTF-8 bytes of the sealed Zcash memo. */
export function termsHash(memo: string): `0x${string}` {
  return keccak256(stringToBytes(memo));
}

/** Salted so the public hash cannot be brute-forced back to a container number. */
export function containerHash(containerSalt: string, container: string): `0x${string}` {
  return keccak256(stringToBytes(`${containerSalt}:${container.trim().toUpperCase()}`));
}

/** Evidence is the SHA-256 of the raw, HMAC-verified carrier webhook body. */
export function evidenceHash(rawBody: Uint8Array | string): `0x${string}` {
  return sha256(typeof rawBody === "string" ? stringToBytes(rawBody) : rawBody);
}

export function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf).slice(2);
}
