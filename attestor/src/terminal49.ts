import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.terminal49.com/v2";

export const LOADED_EVENT = "container.transport.vessel_loaded";
export const DISCHARGED_EVENT = "container.transport.vessel_discharged";

export interface TransportEvent {
  notificationId: string;
  webhookId: string | undefined;
  event: string;
  transportEventId: string;
  containerId: string;
  container: string;
  locode: string;
  /** ISO 8601 UTC. */
  timestamp: string;
  vessel: string;
  source: string;
  scac: string | undefined;
  billOfLading: string | undefined;
}

/** Terminal49 signs the raw body with HMAC-SHA256 and sends the hex digest in X-T49-Webhook-Signature. */
export function verifySignature(rawBody: Uint8Array, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature.trim(), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | null }>;
}

/** Returns null for notifications that are not container transport events. */
export function parseTransportEvent(payload: unknown): TransportEvent | null {
  const p = payload as { data?: JsonApiResource; included?: JsonApiResource[] };
  const event = p.data?.attributes?.event;
  if (typeof event !== "string" || !event.startsWith("container.transport.")) return null;

  const included = p.included ?? [];
  const find = (type: string, id?: string) => included.find((r) => r.type === type && (!id || r.id === id));
  const te = find("transport_event", p.data?.relationships?.reference_object?.data?.id) ?? find("transport_event");
  if (!te?.attributes) return null;

  const containerId = te.relationships?.container?.data?.id;
  const container = containerId ? find("container", containerId) : undefined;
  const vesselRes = find("vessel", te.relationships?.vessel?.data?.id ?? undefined);
  const shipment = find("shipment");
  const a = te.attributes;
  if (!containerId || typeof container?.attributes?.number !== "string") return null;
  if (typeof a.timestamp !== "string" || typeof a.location_locode !== "string") return null;

  const vesselName = typeof vesselRes?.attributes?.name === "string" ? vesselRes.attributes.name : "";
  const voyage = typeof a.voyage_number === "string" ? a.voyage_number : "";

  return {
    notificationId: p.data!.id,
    webhookId: p.data?.relationships?.webhook?.data?.id ?? undefined,
    event: String(a.event ?? event),
    transportEventId: te.id,
    containerId,
    container: container.attributes.number.toUpperCase(),
    locode: a.location_locode.toUpperCase(),
    timestamp: a.timestamp,
    vessel: [vesselName, voyage].filter(Boolean).join(" "),
    source: typeof a.data_source === "string" ? a.data_source : "unknown",
    scac: shipment?.attributes?.shipping_line_scac as string | undefined,
    billOfLading: shipment?.attributes?.bill_of_lading_number as string | undefined,
  };
}

export type RequestType = "bill_of_lading" | "booking_number" | "container";

export class Terminal49 {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async call(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        ...init.headers,
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Terminal49 ${path} ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }

  async createTrackingRequest(requestType: RequestType, requestNumber: string, scac: string): Promise<string> {
    const body = {
      data: { type: "tracking_request", attributes: { request_type: requestType, request_number: requestNumber, scac } },
    };
    const res = await this.call("/tracking_requests", { method: "POST", body: JSON.stringify(body) });
    return res.data.id as string;
  }

  /** Second source: the event must also exist in our Terminal49 account, not just in a signed body. */
  async hasTransportEvent(containerId: string, transportEventId: string): Promise<boolean> {
    const res = await this.call(`/containers/${containerId}/transport_events`);
    return Array.isArray(res?.data) && res.data.some((e: { id: string }) => e.id === transportEventId);
  }
}
