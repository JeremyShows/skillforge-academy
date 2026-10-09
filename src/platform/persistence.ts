import { decryptBackup, encryptBackup } from "../backup";
import { migrateState, SCHEMA_VERSION } from "../logic";
import type { LearnerState } from "../types";
import { importLearnerBackupAtomically, importLegacyLearnerState, learnerStateStore } from "../state/learnerState";
import { sanitizeCourseProgressForContext, type CourseProgressMap, type CourseRuntimeContext } from "./runtime";

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
export interface QuarantinedCourseProgress {
  rawProgress: unknown;
  reason: string;
  quarantinedAt: string;
}
export interface PlatformLearnerEnvelope {
  format: typeof PLATFORM_LEARNER_FORMAT;
  schemaVersion: typeof PLATFORM_LEARNER_SCHEMA_VERSION;
  savedAt: string;
  legacyState: unknown;
  installedPackages: Array<{ packageId: string; courseId: string; courseVersion: string; contentVersion: string; packageVersion?: string; [key: string]: unknown }>;
  courses: Record<string, PlatformLearnerCourseState>;
  quarantinedCourseProgress?: Record<string, QuarantinedCourseProgress[]>;
  [key: string]: unknown;
}
export interface PlatformLearnerLoad { envelope: unknown; recovered: boolean; persisted: boolean; }

export type PlatformLearnerPhase = "idle" | "hydrating" | "ready" | "failed";
export type PlatformLearnerDurability = "idle" | "pending" | "persisted" | "failed";
export type PlatformLearnerMutationAdmission = "accepting" | "quiesced";
export interface PlatformLearnerEnvelopeSnapshot {
  phase: PlatformLearnerPhase;
  envelope: PlatformLearnerEnvelope | null;
  durability: PlatformLearnerDurability;
  mutationAdmission: PlatformLearnerMutationAdmission;
  revision: number;
  durableRevision: number;
  quarantinedCourseNamespaces: string[];
  recovered: boolean;
  error?: string;
}
export interface PlatformMutationAcknowledgement {
  status: "persisted" | "failed" | "rejected";
  revision: number;
  error?: string;
}
export interface PlatformLearnerEnvelopeAdapter {
  load(): Promise<PlatformLearnerLoad>;
  save(envelope: PlatformLearnerEnvelope): Promise<void>;
  importBackup?(legacyState: LearnerState, envelope: PlatformLearnerEnvelope): Promise<void>;
}
export type PlatformLearnerMutator = (current: PlatformLearnerEnvelope) => PlatformLearnerEnvelope;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isRecordMap(value: unknown): value is Record<string, Record<string, unknown>> {
  return isRecord(value) && Object.values(value).every(isRecord);
}
function hasStructurallyValidCourseProgress(value: unknown): boolean {
  if (!isRecord(value) ||
    !isNonEmptyString(value.courseId) ||
    !isNonEmptyString(value.courseVersion) ||
    !isNonEmptyString(value.contentVersion) ||
    !isNonEmptyString(value.updatedAt) ||
    !isRecord(value.current) ||
    !isNonEmptyString(value.current.moduleId) ||
    !isNonEmptyString(value.current.lessonId) ||
    !isNonEmptyString(value.current.activityId) ||
    !isRecordMap(value.lessonProgress) ||
    !isRecordMap(value.moduleProgress) ||
    !Array.isArray(value.reviewQueue) ||
    !Array.isArray(value.sessions) ||
    !Array.isArray(value.weaknessTags) ||
    !Array.isArray(value.assistedActivityIds)) {
    return false;
  }
  if (value.packageId !== undefined && typeof value.packageId !== "string") return false;
  if (value.assessmentAttempts !== undefined && (typeof value.assessmentAttempts !== "number" || !Number.isSafeInteger(value.assessmentAttempts) || value.assessmentAttempts < 0)) return false;
  if (value.notes !== undefined && (!Array.isArray(value.notes) || !value.notes.every(item => typeof item === "string"))) return false;
  if (value.activeSessionId !== undefined && typeof value.activeSessionId !== "string") return false;
  if (value.sessionStartedAt !== undefined && typeof value.sessionStartedAt !== "string") return false;
  if (value.completedAt !== undefined && typeof value.completedAt !== "string") return false;
  if (value.capstone !== undefined && !isRecord(value.capstone)) return false;
  return true;
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function cloneQuarantinedCourseProgress(value: PlatformLearnerEnvelope["quarantinedCourseProgress"]): PlatformLearnerEnvelope["quarantinedCourseProgress"] {
  if (value === undefined) return undefined;
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Quarantined learner progress could not be copied safely.");
  return JSON.parse(serialized) as PlatformLearnerEnvelope["quarantinedCourseProgress"];
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

function sanitizePlatformLearnerEnvelopeInternal(
  value: unknown,
  quarantineInvalidProgress: boolean
): { envelope: PlatformLearnerEnvelope; newlyQuarantined: string[] } {
  if (!isRecord(value)) throw new Error("Saved platform learner data is not an object.");
  if (value.format !== PLATFORM_LEARNER_FORMAT) throw new Error("Saved platform learner data has an unsupported format.");
  if (value.schemaVersion !== PLATFORM_LEARNER_SCHEMA_VERSION) throw new Error("Saved platform learner data has an unsupported schema version.");
  if (!isNonEmptyString(value.savedAt) || !Object.prototype.hasOwnProperty.call(value, "legacyState")) {
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
  const installedByNamespace = new Map(installedPackages.map(identity => [
    identity.packageId + "@" + identity.courseVersion,
    identity
  ]));

  const quarantinedCourseProgress: Record<string, QuarantinedCourseProgress[]> = {};
  if (value.quarantinedCourseProgress !== undefined) {
    if (!isRecord(value.quarantinedCourseProgress)) throw new Error("Saved platform learner data has invalid quarantined course progress.");
    for (const [namespace, records] of Object.entries(value.quarantinedCourseProgress)) {
      if (!namespace || !Array.isArray(records) || records.length === 0 || !records.every(record =>
        isRecord(record) &&
        Object.prototype.hasOwnProperty.call(record, "rawProgress") &&
        isNonEmptyString(record.reason) &&
        isNonEmptyString(record.quarantinedAt)
      )) {
        throw new Error("Saved platform learner data has invalid quarantined progress for " + namespace + ".");
      }
      quarantinedCourseProgress[namespace] = records.map(record => ({ ...record })) as QuarantinedCourseProgress[];
    }
  }

  const courses: Record<string, PlatformLearnerCourseState> = {};
  const newlyQuarantined = new Set<string>();
  for (const [namespace, state] of Object.entries(value.courses)) {
    if (!namespace || !isRecord(state)) throw new Error("Saved platform learner data contains an invalid course entry.");
    for (const slot of ["classroom", "lecture", "labs"] as const) {
      if (Object.prototype.hasOwnProperty.call(state, slot) && !isRecord(state[slot])) {
        throw new Error("Saved platform learner data contains an invalid " + slot + " slot for " + namespace + ".");
      }
    }
    let courseState: PlatformLearnerCourseState = { ...state };
    const structurallyValid = !Object.prototype.hasOwnProperty.call(state, "progress") || hasStructurallyValidCourseProgress(state.progress);
    const installedIdentity = installedByNamespace.get(namespace);
    const progress = isRecord(state.progress) ? state.progress : undefined;
    const identityMatches = !installedIdentity || !progress || (
      progress.courseId === installedIdentity.courseId &&
      progress.courseVersion === installedIdentity.courseVersion &&
      (progress.packageId === undefined || progress.packageId === installedIdentity.packageId)
    );
    if (!structurallyValid || !identityMatches) {
      if (!quarantineInvalidProgress) {
        throw new Error("Saved platform learner data contains invalid CourseProgress for " + namespace + ".");
      }
      const records = quarantinedCourseProgress[namespace] ?? [];
      records.push({
        rawProgress: state.progress === undefined ? { quarantinedUndefinedValue: true } : state.progress,
        reason: !structurallyValid
          ? "CourseProgress did not satisfy the schema-1 structural checks."
          : "CourseProgress identity does not match its installed package namespace.",
        quarantinedAt: value.savedAt
      });
      quarantinedCourseProgress[namespace] = records;
      newlyQuarantined.add(namespace);
      courseState = { ...state };
      delete courseState.progress;
    }
    courses[namespace] = courseState;
  }

  const envelope = {
    ...value,
    format: PLATFORM_LEARNER_FORMAT,
    schemaVersion: PLATFORM_LEARNER_SCHEMA_VERSION,
    installedPackages,
    courses,
    ...(Object.keys(quarantinedCourseProgress).length ? { quarantinedCourseProgress } : {})
  } as PlatformLearnerEnvelope;
  return { envelope, newlyQuarantined: [...newlyQuarantined] };
}

/** Validate schema 1 without stripping compatible fields or accepting malformed known slots. */
export function sanitizePlatformLearnerEnvelope(value: unknown): PlatformLearnerEnvelope {
  return sanitizePlatformLearnerEnvelopeInternal(value, false).envelope;
}

/** Recover only malformed per-course progress slots; envelope-level errors still fail closed. */
function recoverPlatformLearnerEnvelope(value: unknown): { envelope: PlatformLearnerEnvelope; newlyQuarantined: string[] } {
  return sanitizePlatformLearnerEnvelopeInternal(value, true);
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
    envelope: loaded.payload,
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
    mutationAdmission: "accepting",
    revision: 0,
    durableRevision: 0,
    quarantinedCourseNamespaces: [],
    recovered: false
  };
  private hydration?: Promise<PlatformLearnerEnvelopeSnapshot>;
  private writes: Promise<void> = Promise.resolve();
  private acceptedRevision = 0;
  private shutdown?: Promise<{ status: PlatformLearnerDurability; revision: number; durableRevision: number; targetRevision: number; error?: string }>;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly adapter: PlatformLearnerEnvelopeAdapter = {
    load: loadEnvelopeFromStorage,
    save: saveEnvelopeToStorage,
    importBackup: (legacyState, envelope) => importLearnerBackupAtomically(
      legacyState,
      PLATFORM_LEARNER_KEY,
      { courseId: "skillforge-platform", courseVersion: "1.0.0", contentVersion: String(PLATFORM_LEARNER_SCHEMA_VERSION) },
      envelope
    )
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
      const { envelope, newlyQuarantined } = recoverPlatformLearnerEnvelope(loaded.envelope);
      const recoveryNeedsPersistence = loaded.recovered || newlyQuarantined.length > 0;
      const revision = recoveryNeedsPersistence ? this.current.revision + 1 : this.current.revision;
      const hasUndurableRevision = this.current.revision > this.current.durableRevision;
      this.acceptedRevision = Math.max(this.acceptedRevision, revision);
      const snapshot: PlatformLearnerEnvelopeSnapshot = {
        ...this.current,
        phase: "ready",
        envelope,
        durability: recoveryNeedsPersistence ? "pending" : loaded.persisted ? hasUndurableRevision ? "failed" : "persisted" : "idle",
        revision,
        durableRevision: this.current.durableRevision,
        quarantinedCourseNamespaces: Object.keys(envelope.quarantinedCourseProgress ?? {}),
        recovered: loaded.recovered,
        error: hasUndurableRevision && !recoveryNeedsPersistence ? this.current.error : undefined
      };
      this.publish(snapshot);
      if (!recoveryNeedsPersistence) return snapshot;
      return this.adapter.save(envelope).then(() => {
        const persisted = { ...this.current, durability: "persisted" as const, durableRevision: revision, error: undefined };
        this.publish(persisted);
        return persisted;
      }).catch(error => {
        const message = errorMessage(error);
        const recovered = { ...this.current, durability: "failed" as const, error: "Recovered course progress is available but quarantine could not yet be saved: " + message };
        this.publish(recovered);
        return recovered;
      });
    }).catch(error => {
      this.hydration = undefined;
      const message = errorMessage(error);
      this.publish({ ...this.current, phase: "failed", durability: "failed", error: message });
      throw error;
    });
    return this.hydration;
  }

  mutate(mutator: PlatformLearnerMutator): Promise<PlatformMutationAcknowledgement> {
    if (this.current.mutationAdmission === "quiesced") {
      return Promise.resolve({ status: "rejected", revision: this.current.revision, error: "Platform learner mutations are quiesced for shutdown." });
    }
    const ticket = ++this.acceptedRevision;
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

      const revision = Math.max(this.current.revision + 1, ticket);
      let next: PlatformLearnerEnvelope;
      try {
        const protectedQuarantine = cloneQuarantinedCourseProgress(hydrated.envelope.quarantinedCourseProgress);
        const mutationBase = {
          ...hydrated.envelope,
          quarantinedCourseProgress: cloneQuarantinedCourseProgress(protectedQuarantine)
        };
        const candidate = mutator(mutationBase);
        next = sanitizePlatformLearnerEnvelope({
          ...candidate,
          // Quarantine is diagnostic evidence. Ordinary course mutations cannot remove or edit it.
          quarantinedCourseProgress: protectedQuarantine,
          savedAt: this.now()
        });
      } catch (error) {
        const message = errorMessage(error);
        this.publish({ ...this.current, revision, durability: "failed", error: message });
        return { status: "failed", revision, error: message };
      }

      this.publish({ ...this.current, envelope: next, durability: "pending", revision, error: undefined });
      try {
        await this.adapter.save(next);
        this.publish({ ...this.current, durability: "persisted", durableRevision: revision, error: undefined });
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

  importBackup(legacyState: LearnerState, envelope: PlatformLearnerEnvelope): Promise<PlatformMutationAcknowledgement> {
    if (this.current.mutationAdmission === "quiesced") {
      return Promise.resolve({ status: "rejected", revision: this.current.revision, error: "Platform learner mutations are quiesced for shutdown." });
    }
    const ticket = ++this.acceptedRevision;
    const operation = this.writes.then(async (): Promise<PlatformMutationAcknowledgement> => {
      const revision = Math.max(this.current.revision + 1, ticket);
      const previous = this.current;
      try {
        if (!this.adapter.importBackup) throw new Error("This learner-state adapter cannot atomically import platform backups.");
        const durableEnvelope = { ...sanitizePlatformLearnerEnvelope(envelope), savedAt: this.now() };
        await this.adapter.importBackup(legacyState, durableEnvelope);
        this.publish({
          ...previous,
          phase: "ready",
          envelope: durableEnvelope,
          durability: "persisted",
          revision,
          durableRevision: revision,
          quarantinedCourseNamespaces: Object.keys(durableEnvelope.quarantinedCourseProgress ?? {}),
          recovered: false,
          error: undefined
        });
        return { status: "persisted", revision };
      } catch (error) {
        const message = errorMessage(error);
        this.publish({ ...previous, revision, durability: "failed", error: message });
        return { status: "failed", revision, error: message };
      }
    });
    this.writes = operation.then(() => undefined, () => undefined);
    return operation;
  }

  replace(envelope: PlatformLearnerEnvelope): Promise<PlatformMutationAcknowledgement> {
    return this.mutate(() => envelope);
  }
  retryPending(): Promise<PlatformMutationAcknowledgement> {
    return this.mutate(current => current);
  }

  async flush(timeoutMs = 5000): Promise<{ status: PlatformLearnerDurability; revision: number; error?: string }> {
    const targetRevision = this.acceptedRevision;
    const barrier = this.writes;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const completed = barrier.then(() => this.flushResult(targetRevision));
    const timeout = new Promise<{ status: PlatformLearnerDurability; revision: number; error?: string }>(resolve => {
      timer = setTimeout(() => resolve({
        status: "pending",
        revision: targetRevision,
        error: "Platform learner-state flush timed out before revision " + targetRevision + " became durable (durable revision " + this.current.durableRevision + ")."
      }), Math.max(0, timeoutMs));
    });
    const result = await Promise.race([completed, timeout]);
    if (timer !== undefined) clearTimeout(timer);
    return result;
  }

  private flushResult(targetRevision: number): { status: PlatformLearnerDurability; revision: number; error?: string } {
    if (this.current.durability === "failed") return { status: "failed", revision: targetRevision, error: this.current.error ?? "Learner revision " + targetRevision + " was not durably saved." };
    if (this.current.durableRevision >= targetRevision) {
      return {
        status: targetRevision === 0 && this.current.durability === "idle" ? "idle" : "persisted",
        revision: targetRevision
      };
    }
    return { status: "pending", revision: targetRevision, error: "Learner revision " + targetRevision + " remains undurable (durable revision " + this.current.durableRevision + ")." };
  }

  quiesceAndFlush(timeoutMs = 5000): Promise<{ status: PlatformLearnerDurability; revision: number; durableRevision: number; targetRevision: number; error?: string }> {
    if (this.shutdown) return this.shutdown;
    // This synchronous state transition closes admission before taking the final queue barrier.
    this.publish({ ...this.current, mutationAdmission: "quiesced" });
    const admittedRevision = this.acceptedRevision;
    const hydration = this.hydration ?? (this.current.phase === "hydrating" || admittedRevision > 0 ? this.hydrate() : undefined);
    const barrier = this.writes;
    const bounded = async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const completed = barrier.then(async () => {
        if (hydration) await hydration;
        const targetRevision = Math.max(admittedRevision, this.acceptedRevision, this.current.revision);
        const flushed = this.flushResult(targetRevision);
        return { ...flushed, durableRevision: this.current.durableRevision, targetRevision };
      }).catch(error => {
        const targetRevision = Math.max(admittedRevision, this.acceptedRevision, this.current.revision);
        const message = errorMessage(error);
        this.publish({ ...this.current, durability: "failed", error: message });
        return { status: "failed" as const, revision: targetRevision, durableRevision: this.current.durableRevision, targetRevision, error: message };
      });
      const timeout = new Promise<{ status: PlatformLearnerDurability; revision: number; durableRevision: number; targetRevision: number; error: string }>(resolve => {
        timer = setTimeout(() => {
          const targetRevision = Math.max(admittedRevision, this.acceptedRevision, this.current.revision);
          const error = this.current.phase === "hydrating"
            ? "Learner-state hydration or recovery did not complete within the shutdown bound."
            : "Final learner revision " + targetRevision + " is undurable at shutdown (durable revision " + this.current.durableRevision + ").";
          this.publish({ ...this.current, durability: this.current.durableRevision < targetRevision || this.current.phase === "hydrating" ? "failed" : this.current.durability, error });
          resolve({ status: "pending", revision: this.current.revision, durableRevision: this.current.durableRevision, targetRevision, error });
        }, Math.max(0, timeoutMs));
      });
      const result = await Promise.race([completed, timeout]);
      if (timer !== undefined) clearTimeout(timer);
      if (result.status !== "persisted") {
        const error = result.error ?? "Final learner revision " + result.targetRevision + " was not persisted.";
        this.publish({ ...this.current, error });
        return { ...result, error };
      }
      return result;
    };
    this.shutdown = bounded();
    return this.shutdown;
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

export function courseProgressForContext(envelope: PlatformLearnerEnvelope, context: CourseRuntimeContext): CourseProgressMap[string] | undefined {
  const saved = envelope.courses[context.progressNamespace]?.progress;
  return saved === undefined ? undefined : sanitizeCourseProgressForContext(saved, context);
}

export function courseProgressMapFromEnvelope(envelope: PlatformLearnerEnvelope, contexts: readonly CourseRuntimeContext[]): CourseProgressMap {
  const progress: CourseProgressMap = {};
  for (const context of contexts) {
    const sanitized = courseProgressForContext(envelope, context);
    if (sanitized) progress[context.progressNamespace] = sanitized;
  }
  return progress;
}

/** Compatibility boundary: loads through the single owner and never migrates legacy course-progress keys. */
export async function loadPlatformLearnerEnvelope(): Promise<{ envelope: PlatformLearnerEnvelope; recovered: boolean; persisted: boolean }> {
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

function declaresPlatformLearnerFormat(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.format === "string" && value.format.startsWith(PLATFORM_LEARNER_FORMAT);
}

function isLegacyLearnerStatePayload(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const recognized = ["schemaVersion", "name", "activeCertId", "progress", "answered", "attempts", "bookmarks", "lessonsRead", "notes", "cardRatings", "theme"];
  const matches = recognized.filter(key => Object.prototype.hasOwnProperty.call(value, key));
  if (matches.length < 2) return false;
  return (value.schemaVersion === undefined || (typeof value.schemaVersion === "number" && Number.isSafeInteger(value.schemaVersion) && value.schemaVersion >= 0 && value.schemaVersion <= SCHEMA_VERSION)) &&
    (value.name === undefined || typeof value.name === "string") &&
    (value.activeCertId === undefined || typeof value.activeCertId === "string") &&
    (value.progress === undefined || isRecordMap(value.progress)) &&
    (value.answered === undefined || isRecordMap(value.answered)) &&
    (value.attempts === undefined || (Array.isArray(value.attempts) && value.attempts.every(isRecord))) &&
    (value.bookmarks === undefined || (Array.isArray(value.bookmarks) && value.bookmarks.every(item => typeof item === "string"))) &&
    (value.lessonsRead === undefined || (Array.isArray(value.lessonsRead) && value.lessonsRead.every(item => typeof item === "string"))) &&
    (value.notes === undefined || Array.isArray(value.notes)) &&
    (value.cardRatings === undefined || isRecordMap(value.cardRatings)) &&
    (value.theme === undefined || value.theme === "dark" || value.theme === "light");
}

/** Decode and fully validate the selected backup format before any learner store is changed. */
export async function importPlatformBackup(raw: string, passphrase: string): Promise<PlatformLearnerEnvelope> {
  const parsed = await decryptBackup(raw, passphrase);
  if (declaresPlatformLearnerFormat(parsed)) {
    const envelope = sanitizePlatformLearnerEnvelope(parsed);
    if (!isRecord(envelope.legacyState) ||
      (Object.keys(envelope.legacyState).length > 0 && !isLegacyLearnerStatePayload(envelope.legacyState))) {
      throw new Error("Platform learner backup contains invalid legacy learner state.");
    }
    const legacyState = migrateState(envelope.legacyState);
    const normalizedEnvelope = { ...envelope, legacyState };
    const result = await getPlatformLearnerEnvelopeStore().importBackup(legacyState, normalizedEnvelope);
    if (result.status === "failed") throw new Error(result.error ?? "Platform learner backup could not be restored.");
    if (result.status === "rejected") throw new Error(result.error ?? "Platform learner backup import was rejected.");
    return getPlatformLearnerEnvelopeStore().getSnapshot().envelope ?? normalizedEnvelope;
  }
  if (!isLegacyLearnerStatePayload(parsed)) throw new Error("Backup file does not contain a supported SkillForge learner format.");
  const legacyState = migrateState(parsed);
  await importLegacyLearnerState(legacyState);
  // Legacy .apexbackup files update only the existing learner store; migration is deferred.
  return emptyPlatformLearnerEnvelope(legacyState);
}
