import type { Hex } from "viem";
import { attestorUrl } from "./config.ts";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${attestorUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Attestor returned ${res.status}`);
  return body as T;
}

export interface AttestorStatus {
  registered: boolean;
  tracking: string | null;
  attestations: { milestone: string; tx: Hex; evidence: Hex; eventTime: number; replay: number }[];
}

export const attestorStatus = (id: Hex) => call<AttestorStatus>(`/credits/${id}`);

export interface Registration {
  memo: string;
  container: string;
  requestType: "bill_of_lading" | "booking_number" | "container";
  requestNumber: string;
  scac: string;
  signature?: Hex;
}

export const registerContainer = (id: Hex, r: Registration) =>
  call<{ bindTx?: Hex; tracking: string }>(`/credits/${id}/register`, { method: "POST", body: JSON.stringify(r) });

export const replayMilestone = (id: Hex, milestone: "loaded" | "arrived") =>
  call<{ results: { outcome: string; tx?: Hex; reason?: string }[] }>(`/credits/${id}/replay?milestone=${milestone}`, {
    method: "POST",
  });

export const evidenceUrl = (id: Hex, hash: Hex, containerSalt: string) =>
  `${attestorUrl}/credits/${id}/evidence/${hash}?cs=${containerSalt}`;
