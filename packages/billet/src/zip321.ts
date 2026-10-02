/**
 * ZIP 321 payment request for one shielded recipient with a text memo: the string a wallet scans as a QR.
 * The address comes from WebZjs, so it is valid by construction; it is only checked for a shielded prefix,
 * because a memo is meaningless to a transparent address.
 */
export function zip321(req: { address: string; amount: string; memo: string; label?: string }): string {
  if (!/^(u|zs|utest|ztestsapling)1/.test(req.address)) throw new Error("ZIP 321: a memo needs a shielded address");
  if (!/^\d+(\.\d{1,8})?$/.test(req.amount)) throw new Error(`ZIP 321: bad ZEC amount "${req.amount}"`);
  const bytes = new TextEncoder().encode(req.memo);
  if (bytes.length > 512) throw new Error(`ZIP 321: memo is ${bytes.length} bytes, the limit is 512`);
  const params = [`amount=${req.amount}`, `memo=${base64url(bytes)}`];
  if (req.label) params.push(`label=${encodeURIComponent(req.label)}`);
  return `zcash:${req.address}?${params.join("&")}`;
}

/** RFC 4648 base64url without padding, as ZIP 321 requires for memos. */
function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
