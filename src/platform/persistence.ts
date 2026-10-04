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
}
export interface PlatformLearnerEnvelope {
  format: typeof PLATFORM_LEARNER_FORMAT;
  schemaVersion: typeof PLATFORM_LEARNER_SCHEMA_VERSION;
  savedAt: string;
  legacyState: unknown;
  installedPackages: Array<{ packageId: string; courseId: string; courseVersion: string; contentVersion: string }>;
  courses: Record<string, PlatformLearnerCourseState>;
}
export interface PlatformLearnerLoad { envelope: PlatformLearnerEnvelope; recovered: boolean; }

export function emptyPlatformLearnerEnvelope(legacyState: unknown = {}): PlatformLearnerEnvelope {
  return { format: PLATFORM_LEARNER_FORMAT, schemaVersion: PLATFORM_LEARNER_SCHEMA_VERSION, savedAt: new Date().toISOString(), legacyState, installedPackages: [], courses: {} };
}
function isEnvelope(value: unknown): value is PlatformLearnerEnvelope {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    (value as Partial<PlatformLearnerEnvelope>).format === PLATFORM_LEARNER_FORMAT &&
    (value as Partial<PlatformLearnerEnvelope>).schemaVersion === PLATFORM_LEARNER_SCHEMA_VERSION &&
    typeof (value as Partial<PlatformLearnerEnvelope>).courses === "object");
}
export async function loadPlatformLearnerEnvelope(): Promise<PlatformLearnerLoad> {
  const loaded = await learnerStateStore().load<PlatformLearnerEnvelope>(PLATFORM_LEARNER_KEY);
  if (isEnvelope(loaded.payload)) return { envelope: loaded.payload, recovered: loaded.recovered };
  return { envelope: emptyPlatformLearnerEnvelope(), recovered: loaded.recovered };
}
export async function savePlatformLearnerEnvelope(envelope: PlatformLearnerEnvelope): Promise<void> {
  const next = { ...envelope, savedAt: new Date().toISOString() };
  await learnerStateStore().save(PLATFORM_LEARNER_KEY, { courseId: "skillforge-platform", courseVersion: "1.0.0", contentVersion: String(PLATFORM_LEARNER_SCHEMA_VERSION) }, next);
}
export async function saveCourseProgressInPlatformEnvelope(progressMap: CourseProgressMap): Promise<void> {
  const loaded = await loadPlatformLearnerEnvelope();
  const courses = { ...loaded.envelope.courses };
  for (const [key, progress] of Object.entries(progressMap)) courses[key] = { ...courses[key], progress };
  await savePlatformLearnerEnvelope({ ...loaded.envelope, courses });
}
export async function exportPlatformBackup(legacyState: unknown, passphrase: string): Promise<string> {
  const loaded = await loadPlatformLearnerEnvelope();
  return encryptBackup({ ...loaded.envelope, legacyState }, passphrase);
}
export async function importPlatformBackup(raw: string, passphrase: string): Promise<PlatformLearnerEnvelope> {
  const parsed = await decryptBackup(raw, passphrase);
  if (isEnvelope(parsed)) { await savePlatformLearnerEnvelope(parsed); return parsed; }
  // Legacy .apexbackup files are raw LearnerState JSON and remain importable.
  return emptyPlatformLearnerEnvelope(parsed);
}
export function isPlatformLearnerEnvelope(value: unknown): value is PlatformLearnerEnvelope { return isEnvelope(value); }

