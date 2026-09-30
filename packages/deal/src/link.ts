// Everything after "#" stays in the browser: fragments are never sent in HTTP requests.
export interface DealLink {
  chainId: number;
  escrow: `0x${string}`;
  id: `0x${string}`;
  /** Unified full viewing key (ZIP 316) for the one-deal Zcash account. Read-only. */
  ufvk: string;
  /** Block height the deal account was created at, so WebZjs only scans from there. */
  birthday: number;
}

export function encodeDealFragment(link: DealLink): string {
  const p = new URLSearchParams({
    c: String(link.chainId),
    lc: link.escrow.toLowerCase(),
    id: link.id.toLowerCase(),
    b: String(link.birthday),
    k: link.ufvk,
  });
  return `#${p.toString()}`;
}

export function decodeDealFragment(fragment: string): DealLink | null {
  const p = new URLSearchParams(fragment.replace(/^#/, ""));
  const chainId = Number(p.get("c"));
  const birthday = Number(p.get("b"));
  const escrow = p.get("lc");
  const id = p.get("id");
  const ufvk = p.get("k");
  if (!chainId || !Number.isSafeInteger(birthday) || !escrow || !id || !ufvk) return null;
  if (!/^0x[0-9a-f]{40}$/.test(escrow) || !/^0x[0-9a-f]{64}$/.test(id)) return null;
  if (!/^uview/.test(ufvk)) return null;
  return { chainId, escrow: escrow as `0x${string}`, id: id as `0x${string}`, ufvk, birthday };
}
