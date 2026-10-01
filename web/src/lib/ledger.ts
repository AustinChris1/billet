// What this browser has issued, kept locally so the issuer can come back to it. Nothing here leaves the device.
const ISSUED = "billet.issued.v1";
const PENDING = "billet.pending.v1";
const PROFILE = "billet.profile.v1";

export interface IssuedBillet {
  url: string;
  memo: string;
  at: string;
}

export interface PendingSeal {
  memo: string;
  fromHeight: number;
}

export interface Profile {
  from: string;
  payTo: string;
  chainId: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the session still works, it just will not be remembered */
  }
}

export const loadIssued = () => read<IssuedBillet[]>(ISSUED, []);
export function addIssued(b: IssuedBillet) {
  write(ISSUED, [b, ...loadIssued().filter((x) => x.url !== b.url)]);
}

export const loadPending = () => read<PendingSeal | null>(PENDING, null);
export const savePending = (p: PendingSeal | null) => write(PENDING, p);

export const loadProfile = () => read<Profile | null>(PROFILE, null);
export const saveProfile = (p: Profile) => write(PROFILE, p);
