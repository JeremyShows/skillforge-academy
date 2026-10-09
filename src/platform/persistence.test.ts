import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlatformLearnerEnvelope, exportPlatformBackup, importPlatformBackup, isPlatformLearnerEnvelope, loadPlatformLearnerEnvelope, PlatformLearnerEnvelopeStore, resetPlatformLearnerEnvelopeStoreForTests, saveInstalledPackageIdentity, savePlatformLearnerEnvelope } from "./persistence";
import { resetLearnerStateStoreForTests } from "../state/learnerState";

function installBrowserStorage(): Map<string, string> {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } as unknown as Storage;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  resetLearnerStateStoreForTests();
  resetPlatformLearnerEnvelopeStoreForTests();
  return values;
}

// This fixture proves envelope shape only; course-aware validity is covered by runtime tests.
function envelopeProgressFixture(extra: Record<string, unknown> = {}) {
  return {
    courseId: "fixture-course",
    courseVersion: "1.0.0",
    contentVersion: "fixture-content-1",
    current: { moduleId: "fixture-module", lessonId: "fixture-lesson", activityId: "fixture-activity" },
    lessonProgress: {},
    moduleProgress: {},
    reviewQueue: [],
    sessions: [],
    weaknessTags: [],
    assistedActivityIds: [],
    updatedAt: "2026-10-09T00:00:00.000Z",
    packageId: "fixture.package",
    completedLessonIds: [],
    completedUnitIds: [],
    assessmentAttempts: 0,
    notes: [],
    ...extra
  };
}

describe("unified platform learner persistence", () => {
  beforeEach(() => installBrowserStorage());

  it("stores a versioned envelope with isolated course, classroom, lecture, and lab slots", async () => {
    const envelope = emptyPlatformLearnerEnvelope({ schemaVersion: 3, activeCertId: "a-plus" });
    envelope.installedPackages = [{ packageId: "fixture.package", courseId: "fixture-course", courseVersion: "1.0.0", contentVersion: "fixture-1" }];
    envelope.courses["fixture.package@1.0.0"] = { progress: envelopeProgressFixture({ completed: ["activity-1"] }), classroom: { session: "paused" }, lecture: { cursor: "segment-2" }, labs: { run: "active" } };
    await savePlatformLearnerEnvelope(envelope);
    const loaded = await loadPlatformLearnerEnvelope();
    expect(isPlatformLearnerEnvelope(loaded.envelope)).toBe(true);
    expect(loaded.envelope.legacyState).toEqual({ schemaVersion: 3, activeCertId: "a-plus" });
    expect(loaded.envelope.courses["fixture.package@1.0.0"].lecture).toEqual({ cursor: "segment-2" });
    expect(loaded.envelope.courses["fixture.package@1.0.0"].labs).toEqual({ run: "active" });
  });

  it("round-trips the new platform envelope through encrypted backup export/import", async () => {
    const envelope = emptyPlatformLearnerEnvelope({ name: "Legacy" });
    const savedProgress = envelopeProgressFixture({ resumeMarker: "a" });
    envelope.courses["package-a@1.0.0"] = { progress: savedProgress, classroom: { record: "class" } };
    await savePlatformLearnerEnvelope(envelope);
    const raw = await exportPlatformBackup({ name: "Legacy" }, "platform-passphrase");
    installBrowserStorage();
    const imported = await importPlatformBackup(raw, "platform-passphrase");
    expect(imported.legacyState).toEqual({ name: "Legacy" });
    expect(imported.courses["package-a@1.0.0"].classroom).toEqual({ record: "class" });
    expect((await loadPlatformLearnerEnvelope()).envelope.courses["package-a@1.0.0"].progress).toEqual(savedProgress);
  });

  it("keeps legacy raw apex backups importable without replacing the platform envelope contract", async () => {
    const imported = await importPlatformBackup('{"name":"Legacy learner","answered":{}}', "");
    expect(imported.format).toBe("skillforge-platform-learner");
    expect(imported.legacyState).toEqual({ name: "Legacy learner", answered: {} });
    expect(imported.courses).toEqual({});
  });

  it("keeps legacy course progress separate from the platform envelope", async () => {
    const legacy = { "fixture.package@1.0.0": { courseId: "fixture-course", completedLessonIds: ["lesson-1"] } };
    (globalThis.localStorage as Storage).setItem("skillforge-course-progress-v1", JSON.stringify(legacy));
    await saveInstalledPackageIdentity({ packageId: "fixture.package", courseId: "fixture-course", courseVersion: "1.0.0", contentVersion: "content-1", packageVersion: "1.0.0" });
    const loaded = await loadPlatformLearnerEnvelope();
    expect(loaded.envelope.installedPackages[0]).toMatchObject({ packageId: "fixture.package", courseId: "fixture-course", contentVersion: "content-1", packageVersion: "1.0.0" });
    expect(loaded.envelope.courses["fixture.package@1.0.0"]?.progress).toBeUndefined();
    expect(JSON.parse((globalThis.localStorage as Storage).getItem("skillforge-course-progress-v1") ?? "{}")).toEqual(legacy);
  });

  it("rejects object-shaped or incomplete CourseProgress during envelope hydration", async () => {
    const malformedProgresses = [
      {},
      { ...envelopeProgressFixture(), current: {} },
      { ...envelopeProgressFixture(), sessions: undefined }
    ];

    for (const progress of malformedProgresses) {
      const malformed = emptyPlatformLearnerEnvelope();
      malformed.courses["fixture.package@1.0.0"] = { progress };
      const save = vi.fn(async () => undefined);
      const store = new PlatformLearnerEnvelopeStore({
        load: async () => ({ envelope: malformed, recovered: false, persisted: true }),
        save
      });

      await expect(store.hydrate()).rejects.toThrow("structurally invalid CourseProgress");
      expect(store.getSnapshot()).toMatchObject({ phase: "failed", envelope: null, durability: "failed" });
      expect(save).not.toHaveBeenCalled();
      expect(isPlatformLearnerEnvelope(malformed)).toBe(false);
    }
  });
});
