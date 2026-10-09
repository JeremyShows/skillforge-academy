import { decryptBackup, encryptBackup } from "../backup";
import { learnerStateStore } from "../state/learnerState";
import type { CourseProgressMap } from "./runtime";

export const PLATFORM_LEARNER_FORMAT = "skillforge-platform-learner" as const;
export const PLATFORM_LEARNER_SCHEMA_VERSION = 1 as const;
export const PLATFORM_LEARNER_KEY = "skillforge-platform-learner-v1";

export interface PlatformLearnerCourseState {
  progress?: unknown;
  classroom?: unknown;
  lecture?: unknown;
  labs?: unknown;
  [key: string]: unknown;
}
export interface PlatformLearnerEnvelope {
  format: typeof PLATFORM_LEARNER_FORMAT;
  schemaVersion: typeof PLATFORM_LEARNER_SCHEMA_VERSION;
  savedAt: string;
  legacyState: unknown;
  installedPackages: Array<{ packageId: string; courseId: string; courseVersion: string; contentVersion: string; packageVersion?: string; [key: string]: unknown }>;
  courses: Record<string, PlatformLearnerCourseState>;
  [key: string]: unknown;
}
export interface PlatformLearnerLoad { envelope: PlatformLearnerEnvelope; recovered: boolean; persisted: boolean; }

export type PlatformLearnerPhase = "idle" | "hydrating" | "ready" | "failed";
export type PlatformLearnerDurability = "idle" | "pending" | "persisted" | "failed";
export interface PlatformLearnerEnvelopeSnapshot {
  phase: PlatformLearnerPhase;
  envelope: PlatformLearnerEnvelope | null;
  durability: PlatformLearnerDurability;
  revision: number;
  recovered: boolean;
  error?: string;
}
export interface PlatformMutationAcknowledgement {
  status: "persisted" | "failed";
  revision: number;
  error?: string;
}
export interface PlatformLearnerEnvelopeAdapter {
  load(): Promise<PlatformLearnerLoad>;
  save(envelope: PlatformLearnerEnvelope): Promise<void>;
}
export type PlatformLearnerMutator = (current: PlatformLearnerEnvelope) => PlatformLearnerEnvelope;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function emptyPlatformLearnerEnvelope(legacyState: unknown = {}): PlatformLearnerEnvelope {
  return {
    format: PLATFORM_LEARNER_FORMAT,
    schemaVersion: PLATFORM_LEARNER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    legacyState,
    installedPackages: [],
    courses: {}
  };
}

/** Validate schema 1 without stripping compatible fields the current runtime does not understand. */
export function sanitizePlatformLearnerEnvelope(value: unknown): PlatformLearnerEnvelope {
  if (!isRecord(value)) throw new Error("Saved platform learner data is not an object.");
  if (value.format !== PLATFORM_LEARNER_FORMAT) throw new Error("Saved platform learner data has an unsupported format.");
  if (value.schemaVersion !== PLATFORM_LEARNER_SCHEMA_VERSION) throw new Error("Saved platform learner data has an unsupported schema version.");
  if (typeof value.savedAt !== "string" || !Object.prototype.hasOwnProperty.call(value, "legacyState")) {
    throw new Error("Saved platform learner data is incomplete.");
  }
  if (!Array.isArray(value.installedPackages) || !isRecord(value.courses)) {
    throw new Error("Saved platform learner data has invalid course metadata.");
  }

  const seenPackages = new Set<string>();
  const installedPackages = value.installedPackages.map((identity, index) => {
    if (!isRecord(identity) ||
      typeof identity.packageId !== "string" || !identity.packageId.trim() ||
      typeof identity.courseId !== "string" || !identity.courseId.trim() ||
      typeof identity.courseVersion !== "string" || !identity.courseVersion.trim() ||
      typeof identity.contentVersion !== "string" || !identity.contentVersion.trim() ||
      (identity.packageVersion !== undefined && typeof identity.packageVersion !== "string")) {
      throw new Error("Saved platform learner data has invalid installed package metadata at entry " + index + ".");
    }
    if (seenPackages.has(identity.packageId)) {
      throw new Error("Saved platform learner data contains conflicting package identities.");
    }
    seenPackages.add(identity.packageId);
    return { ...identity } as PlatformLearnerEnvelope["installedPackages"][number];
  });

  const courses: Record<string, PlatformLearnerCourseState> = {};
  for (const [namespace, state] of Object.entries(value.courses)) {
    if (!namespace || !isRecord(state)) throw new Error("Saved platform learner data contains an invalid course entry.");
    for (const slot of ["progress", "classroom", "lecture", "labs"] as const) {
      if (Object.prototype.hasOwnProperty.call(state, slot) && !isRecord(state[slot])) {
        throw new Error("Saved platform learner data contains an invalid " + slot + " slot for " + namespace + ".");
      }
    }
    courses[namespace] = { ...state };
  }

  return {
    ...value,
    format: PLATFORM_LEARNER_FORMAT,
    schemaVersion: PLATFORM_LEARNER_SCHEMA_VERSION,
    installedPackages,
    courses
  } as PlatformLearnerEnvelope;
}

export function isPlatformLearnerEnvelope(value: unknown): value is PlatformLearnerEnvelope {
  try {
    sanitizePlatformLearnerEnvelope(value);
    return true;
  } catch {
    return false;
  }
}

async function loadEnvelopeFromStorage(): Promise<PlatformLearnerLoad> {
  const loaded = await learnerStateStore().load<PlatformLearnerEnvelope>(PLATFORM_LEARNER_KEY);
  if (loaded.error) throw new Error(loaded.error);
  if (loaded.payload === null || loaded.payload === undefined) {
    return { envelope: emptyPlatformLearnerEnvelope(), recovered: loaded.recovered, persisted: false };
  }
  return {
    envelope: sanitizePlatformLearnerEnvelope(loaded.payload),
    recovered: loaded.recovered,
    persisted: true
  };
}

async function saveEnvelopeToStorage(envelope: PlatformLearnerEnvelope): Promise<void> {
  await learnerStateStore().save(
    PLATFORM_LEARNER_KEY,
    { courseId: "skillforge-platform", courseVersion: "1.0.0", contentVersion: String(PLATFORM_LEARNER_SCHEMA_VERSION) },
    envelope
  );
}

/** One owner for hydration, serialized mutation, persistence acknowledgment, and shutdown flush. */
export class PlatformLearnerEnvelopeStore {
  private current: PlatformLearnerEnvelopeSnapshot = {
    phase: "idle",
    envelope: null,
    durability: "idle",
    revision: 0,
    recovered: false
  };
  private hydration?: Promise<PlatformLearnerEnvelopeSnapshot>;
  private writes: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly adapter: PlatformLearnerEnvelopeAdapter = {
    load: loadEnvelopeFromStorage,
    save: saveEnvelopeToStorage
  }, private readonly now: () => string = () => new Date().toISOString()) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PlatformLearnerEnvelopeSnapshot => this.current;
  getServerSnapshot = (): PlatformLearnerEnvelopeSnapshot => this.current;

  private publish(next: PlatformLearnerEnvelopeSnapshot): void {
    this.current = next;
    for (const listener of this.listeners) listener();
  }

  hydrate(): Promise<PlatformLearnerEnvelopeSnapshot> {
    if (this.current.phase === "ready") return Promise.resolve(this.current);
    if (this.hydration) return this.hydration;

    this.publish({ ...this.current, phase: "hydrating", error: undefined });
    this.hydration = this.adapter.load().then(loaded => {
      const envelope = sanitizePlatformLearnerEnvelope(loaded.envelope);
      const snapshot: PlatformLearnerEnvelopeSnapshot = {
        phase: "ready",
        envelope,
        durability: loaded.persisted ? "persisted" : "idle",
        revision: this.current.revision,
        recovered: loaded.recovered
      };
      this.publish(snapshot);
      return snapshot;
    }).catch(error => {
      this.hydration = undefined;
      const message = errorMessage(error);
      this.publish({ ...this.current, phase: "failed", durability: "failed", error: message });
      throw error;
    });
    return this.hydration;
  }

  mutate(mutator: PlatformLearnerMutator): Promise<PlatformMutationAcknowledgement> {
    const operation = this.writes.then(async (): Promise<PlatformMutationAcknowledgement> => {
      let hydrated: PlatformLearnerEnvelopeSnapshot;
      try {
        hydrated = await this.hydrate();
      } catch (error) {
        return { status: "failed", revision: this.current.revision, error: errorMessage(error) };
      }
      if (!hydrated.envelope) {
        const error = "Platform learner data is not ready.";
        this.publish({ ...this.current, phase: "failed", durability: "failed", error });
        return { status: "failed", revision: this.current.revision, error };
      }

      const revision = this.current.revision + 1;
      let next: PlatformLearnerEnvelope;
      try {
        next = sanitizePlatformLearnerEnvelope({ ...mutator(hydrated.envelope), savedAt: this.now() });
      } catch (error) {
        const message = errorMessage(error);
        this.publish({ ...this.current, durability: "failed", error: message });
        return { status: "failed", revision: this.current.revision, error: message };
      }

      this.publish({ ...this.current, envelope: next, durability: "pending", revision, error: undefined });
      try {
        await this.adapter.save(next);
        this.publish({ ...this.current, durability: "persisted", error: undefined });
        return { status: "persisted", revision };
      } catch (error) {
        const message = errorMessage(error);
        this.publish({ ...this.current, durability: "failed", error: message });
        return { status: "failed", revision, error: message };
      }
    });

    this.writes = operation.then(() => undefined, () => undefined);
    return operation;
  }

  replace(envelope: PlatformLearnerEnvelope): Promise<PlatformMutationAcknowledgement> {
    const sanitized = sanitizePlatformLearnerEnvelope(envelope);
    return this.mutate(() => sanitized);
  }
  retryPending(): Promise<PlatformMutationAcknowledgement> {
    return this.mutate(current => current);
  }

  async flush(timeoutMs = 5000): Promise<{ status: PlatformLearnerDurability; revision: number; error?: string }> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const completed = this.writes.then(() => ({
      status: this.current.durability,
      revision: this.current.revision,
      error: this.current.error
    }));
    const timeout = new Promise<{ status: PlatformLearnerDurability; revision: number; error?: string }>(resolve => {
      timer = setTimeout(() => resolve({
        status: "pending",
        revision: this.current.revision,
        error: "Platform learner-state flush timed out."
      }), Math.max(0, timeoutMs));
    });
    const result = await Promise.race([completed, timeout]);
    if (timer !== undefined) clearTimeout(timer);
    return result;
  }
}

let canonicalStore: PlatformLearnerEnvelopeStore | undefined;

export function getPlatformLearnerEnvelopeStore(): PlatformLearnerEnvelopeStore {
  if (!canonicalStore) canonicalStore = new PlatformLearnerEnvelopeStore();
  return canonicalStore;
}

export function resetPlatformLearnerEnvelopeStoreForTests(): void {
  canonicalStore = undefined;
}

export function courseProgressMapFromEnvelope(envelope: PlatformLearnerEnvelope): CourseProgressMap {
  const progress: CourseProgressMap = {};
  for (const [namespace, state] of Object.entries(envelope.courses)) {
    if (state.progress !== undefined) progress[namespace] = state.progress as CourseProgressMap[string];
  }
  return progress;
}

/** Compatibility boundary: loads through the single owner and never migrates legacy course-progress keys. */
export async function loadPlatformLearnerEnvelope(): Promise<PlatformLearnerLoad> {
  const snapshot = await getPlatformLearnerEnvelopeStore().hydrate();
  if (!snapshot.envelope) throw new Error(snapshot.error ?? "Platform learner data could not be loaded.");
  return { envelope: snapshot.envelope, recovered: snapshot.recovered, persisted: snapshot.durability === "persisted" };
}

export async function savePlatformLearnerEnvelope(envelope: PlatformLearnerEnvelope): Promise<PlatformMutationAcknowledgement> {
  return getPlatformLearnerEnvelopeStore().replace(envelope);
}

export async function saveCourseProgressInPlatformEnvelope(progressMap: CourseProgressMap): Promise<PlatformMutationAcknowledgement> {
  return getPlatformLearnerEnvelopeStore().mutate(current => {
    const courses = { ...current.courses };
    for (const [namespace, progress] of Object.entries(progressMap)) {
      courses[namespace] = { ...courses[namespace], progress };
    }
    return { ...current, courses };
  });
}

export async function saveInstalledPackageIdentity(identity: PlatformLearnerEnvelope["installedPackages"][number]): Promise<PlatformMutationAcknowledgement> {
  return getPlatformLearnerEnvelopeStore().mutate(current => ({
    ...current,
    installedPackages: [...current.installedPackages.filter(item => item.packageId !== identity.packageId), identity]
  }));
}

export async function removeInstalledPackageIdentity(packageId: string): Promise<PlatformMutationAcknowledgement> {
  return getPlatformLearnerEnvelopeStore().mutate(current => ({
    ...current,
    installedPackages: current.installedPackages.filter(item => item.packageId !== packageId)
  }));
}

export async function exportPlatformBackup(legacyState: unknown, passphrase: string): Promise<string> {
  const store = getPlatformLearnerEnvelopeStore();
  await store.hydrate();
  const flushed = await store.flush();
  if (flushed.status === "pending" || flushed.status === "failed") {
    throw new Error(flushed.error ?? "Platform learner data could not be durably saved for backup.");
  }
  const snapshot = store.getSnapshot();
  if (!snapshot.envelope) throw new Error(snapshot.error ?? "Platform learner data could not be loaded for backup.");
  return encryptBackup({ ...snapshot.envelope, legacyState }, passphrase);
}

export async function importPlatformBackup(raw: string, passphrase: string): Promise<PlatformLearnerEnvelope> {
  const parsed = await decryptBackup(raw, passphrase);
  if (isPlatformLearnerEnvelope(parsed)) {
    const result = await savePlatformLearnerEnvelope(sanitizePlatformLearnerEnvelope(parsed));
    if (result.status === "failed") throw new Error(result.error ?? "Platform learner backup could not be restored.");
    return getPlatformLearnerEnvelopeStore().getSnapshot().envelope ?? sanitizePlatformLearnerEnvelope(parsed);
  }
  // Legacy .apexbackup files remain importable; migration into the platform envelope is deferred.
  return emptyPlatformLearnerEnvelope(parsed);
}