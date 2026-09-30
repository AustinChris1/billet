import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Hex } from "viem";
import { HttpError, type createService } from "./service.ts";

type Service = ReturnType<typeof createService>;

const MAX_BODY = 512 * 1024;

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "body too large");
    chunks.push(chunk as Buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function startServer(service: Service, opts: { port: number; webOrigin: string; replayTemplates: Record<string, unknown> }) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const origin = req.headers.origin;
    if (origin === opts.webOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      // The web app is cross-origin isolated for WebZjs threads, so our responses must opt in.
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
    if (req.method === "OPTIONS") return res.writeHead(204).end();

    try {
      const parts = url.pathname.split("/").filter(Boolean);

      if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });

      if (req.method === "POST" && url.pathname === "/webhooks/terminal49") {
        const raw = await readBody(req);
        const sig = req.headers["x-t49-webhook-signature"];
        return json(res, 200, { results: await service.webhook(raw, Array.isArray(sig) ? sig[0] : sig) });
      }

      if (parts[0] === "credits" && parts[1]) {
        const id = parts[1].toLowerCase() as Hex;
        if (req.method === "GET" && parts.length === 2) return json(res, 200, service.status(id));
        if (req.method === "POST" && parts[2] === "register") {
          const body = JSON.parse(new TextDecoder().decode(await readBody(req)));
          return json(res, 200, await service.register(id, body));
        }
        if (req.method === "POST" && parts[2] === "replay") {
          const milestone = url.searchParams.get("milestone");
          if (milestone !== "loaded" && milestone !== "arrived") throw new HttpError(400, "milestone must be loaded or arrived");
          const template = opts.replayTemplates[milestone];
          return json(res, 200, { results: await service.replay(id, milestone, template) });
        }
        if (req.method === "GET" && parts[2] === "evidence" && parts[3]) {
          const file = await service.evidence(id, parts[3].toLowerCase(), url.searchParams.get("cs") ?? "");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(file);
        }
      }

      json(res, 404, { error: "not found" });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : err instanceof SyntaxError ? 400 : 500;
      if (status === 500) console.error(err);
      json(res, status, { error: status === 500 ? "internal error" : (err as Error).message });
    }
  });
  server.listen(opts.port);
  return server;
}
