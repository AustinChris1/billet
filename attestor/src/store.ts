import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Registration } from "./rules.ts";

export interface StoredRegistration extends Registration {
  memo: string;
  requestType: string;
  requestNumber: string;
  scac: string;
  trackingId: string | null;
  createdAt: number;
}

export interface Attestation {
  id: string;
  milestone: string;
  tx: string;
  evidence: string;
  eventTime: number;
  replay: number;
  createdAt: number;
}

export class Store {
  private readonly db: DatabaseSync;
  private readonly evidenceDir: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.evidenceDir = join(dataDir, "evidence");
    mkdirSync(this.evidenceDir, { recursive: true });
    this.db = new DatabaseSync(join(dataDir, "attestor.db"));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY, container TEXT NOT NULL, pol TEXT NOT NULL, pod TEXT NOT NULL,
        container_salt TEXT NOT NULL, memo TEXT NOT NULL, request_type TEXT NOT NULL,
        request_number TEXT NOT NULL, scac TEXT NOT NULL, tracking_id TEXT, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS registrations_container ON registrations(container);
      CREATE TABLE IF NOT EXISTS attestations (
        id TEXT NOT NULL, milestone TEXT NOT NULL, tx TEXT NOT NULL, evidence TEXT NOT NULL,
        event_time INTEGER NOT NULL, replay INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
        PRIMARY KEY (id, milestone)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id TEXT PRIMARY KEY, received_at INTEGER NOT NULL, outcome TEXT NOT NULL
      );
    `);
  }

  saveRegistration(r: StoredRegistration): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO registrations VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(r.id, r.container, r.pol, r.pod, r.containerSalt, r.memo, r.requestType, r.requestNumber, r.scac, r.trackingId, r.createdAt);
  }

  registration(id: string): StoredRegistration | undefined {
    const row = this.db.prepare(`SELECT * FROM registrations WHERE id = ?`).get(id);
    return row ? toRegistration(row) : undefined;
  }

  registrationsForContainer(container: string): StoredRegistration[] {
    return this.db.prepare(`SELECT * FROM registrations WHERE container = ?`).all(container).map(toRegistration);
  }

  attestations(id: string): Attestation[] {
    return this.db
      .prepare(`SELECT id, milestone, tx, evidence, event_time AS eventTime, replay, created_at AS createdAt FROM attestations WHERE id = ? ORDER BY created_at`)
      .all(id) as unknown as Attestation[];
  }

  saveAttestation(a: Attestation): void {
    this.db
      .prepare(`INSERT OR IGNORE INTO attestations VALUES (?,?,?,?,?,?,?)`)
      .run(a.id, a.milestone, a.tx, a.evidence, a.eventTime, a.replay, a.createdAt);
  }

  /** Returns false when the notification was already handled (Terminal49 retries deliveries). */
  markNotification(notificationId: string, outcome: string): boolean {
    const res = this.db
      .prepare(`INSERT OR IGNORE INTO notifications VALUES (?,?,?)`)
      .run(notificationId, Date.now(), outcome);
    return res.changes > 0;
  }

  saveEvidence(hash: string, raw: Uint8Array): void {
    const file = join(this.evidenceDir, `${hash}.json`);
    if (!existsSync(file)) writeFileSync(file, raw);
  }

  evidence(hash: string): Buffer | undefined {
    if (!/^0x[0-9a-f]{64}$/.test(hash)) return undefined;
    const file = join(this.evidenceDir, `${hash}.json`);
    return existsSync(file) ? readFileSync(file) : undefined;
  }
}

function toRegistration(row: Record<string, unknown>): StoredRegistration {
  return {
    id: row.id as `0x${string}`,
    container: row.container as string,
    pol: row.pol as string,
    pod: row.pod as string,
    containerSalt: row.container_salt as string,
    memo: row.memo as string,
    requestType: row.request_type as string,
    requestNumber: row.request_number as string,
    scac: row.scac as string,
    trackingId: (row.tracking_id as string | null) ?? null,
    createdAt: Number(row.created_at),
  };
}
