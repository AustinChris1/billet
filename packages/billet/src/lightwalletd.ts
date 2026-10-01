// Minimal gRPC-web client for lightwalletd's CompactTxStreamer: just enough to fetch a raw transaction and the tip.

const SERVICE = "cash.z.wallet.sdk.rpc.CompactTxStreamer";

function frame(message: Uint8Array): Uint8Array {
  const out = new Uint8Array(5 + message.length);
  new DataView(out.buffer).setUint32(1, message.length);
  out.set(message, 5);
  return out;
}

function varint(n: bigint): number[] {
  const out: number[] = [];
  while (n >= 0x80n) {
    out.push(Number(n & 0x7fn) | 0x80);
    n >>= 7n;
  }
  out.push(Number(n));
  return out;
}

function readVarint(buf: Uint8Array, pos: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  for (;;) {
    const b = buf[pos++];
    if (b === undefined) throw new Error("truncated varint");
    result |= BigInt(b & 0x7f) << shift;
    if (b < 0x80) return [result, pos];
    shift += 7n;
  }
}

/** Splits a protobuf message into its fields; length-delimited values come back as bytes. */
function fields(buf: Uint8Array): Map<number, (bigint | Uint8Array)[]> {
  const out = new Map<number, (bigint | Uint8Array)[]>();
  let pos = 0;
  while (pos < buf.length) {
    const [key, p1] = readVarint(buf, pos);
    const field = Number(key >> 3n);
    const wire = Number(key & 7n);
    let value: bigint | Uint8Array;
    if (wire === 0) {
      [value, pos] = readVarint(buf, p1);
    } else if (wire === 2) {
      const [len, p2] = readVarint(buf, p1);
      value = buf.slice(p2, p2 + Number(len));
      pos = p2 + Number(len);
    } else {
      throw new Error(`unsupported protobuf wire type ${wire}`);
    }
    out.set(field, [...(out.get(field) ?? []), value]);
  }
  return out;
}

async function unary(proxy: string, method: string, body: Uint8Array): Promise<Uint8Array> {
  const res = await fetch(`${proxy.replace(/\/$/, "")}/${SERVICE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/grpc-web+proto", "X-Grpc-Web": "1" },
    body: frame(body) as BodyInit,
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let pos = 0;
  let message: Uint8Array | null = null;
  while (pos + 5 <= buf.length) {
    const flag = buf[pos]!;
    const len = new DataView(buf.buffer, buf.byteOffset + pos + 1, 4).getUint32(0);
    const chunk = buf.slice(pos + 5, pos + 5 + len);
    if (flag & 0x80) {
      const trailers = new TextDecoder().decode(chunk);
      const status = /grpc-status:\s*(\d+)/i.exec(trailers)?.[1];
      if (status && status !== "0") {
        throw new Error(`${method}: ${/grpc-message:\s*(.*)/i.exec(trailers)?.[1]?.trim() ?? `status ${status}`}`);
      }
    } else {
      message = chunk;
    }
    pos += 5 + len;
  }
  const headerStatus = res.headers.get("grpc-status");
  if (headerStatus && headerStatus !== "0") throw new Error(`${method}: ${res.headers.get("grpc-message") ?? headerStatus}`);
  if (!message) throw new Error(`${method}: empty response`);
  return message;
}

const hexToBytes = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export interface RawTransaction {
  txHex: string;
  /** Mined height; 0 while still in the mempool. */
  height: number;
}

/** Fetches a transaction by its display txid (big-endian hex). */
export async function getTransaction(proxy: string, txid: string): Promise<RawTransaction> {
  if (!/^[0-9a-f]{64}$/i.test(txid)) throw new Error("txid must be 64 hex chars");
  const hash = hexToBytes(txid).reverse();
  const filter = Uint8Array.from([0x1a, ...varint(BigInt(hash.length)), ...hash]);
  const raw = fields(await unary(proxy, "GetTransaction", filter));
  const data = raw.get(1)?.[0];
  const height = raw.get(2)?.[0];
  if (!(data instanceof Uint8Array)) throw new Error("GetTransaction: no data");
  return { txHex: bytesToHex(data), height: typeof height === "bigint" ? Number(height) : 0 };
}

export async function getLatestHeight(proxy: string): Promise<number> {
  const block = fields(await unary(proxy, "GetLatestBlock", new Uint8Array()));
  const height = block.get(1)?.[0];
  return typeof height === "bigint" ? Number(height) : 0;
}

/** Display txids of every non-coinbase transaction in a block, from its compact form. */
export async function getBlockTxids(proxy: string, height: number): Promise<string[]> {
  const blockId = Uint8Array.from([0x08, ...varint(BigInt(height))]);
  const block = fields(await unary(proxy, "GetBlock", blockId));
  const out: string[] = [];
  for (const vtx of block.get(7) ?? []) {
    if (!(vtx instanceof Uint8Array)) continue;
    const tx = fields(vtx);
    const index = tx.get(1)?.[0];
    const hash = tx.get(2)?.[0];
    if (hash instanceof Uint8Array && index !== 0n) out.push(bytesToHex(hash.slice().reverse()));
  }
  return out;
}

/** Tries each proxy in turn and returns the first answer. */
export async function withProxies<T>(proxies: string[], fn: (proxy: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const p of proxies) {
    try {
      return await fn(p);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
