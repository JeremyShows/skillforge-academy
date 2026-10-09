import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlatformLearnerEnvelope, exportPlatformBackup, importPlatformBackup, isPlatformLearnerEnvelope, loadPlatformLearnerEnvelope, PlatformLearnerEnvelopeStore, resetPlatformLearnerEnvelopeStoreForTests, saveInstalledPackageIdentity, savePlatformLearnerEnvelope } from "./persistence";
import { PLATFORM_LEARNER_KEY } from "./persistence";
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
    const raw = await exportPlatformBackup({ name: "Legacy", answered: {} }, "platform-passphrase");
    installBrowserStorage();
    const imported = await importPlatformBackup(raw, "platform-passphrase");
    expect(imported.legacyState).toMatchObject({ name: "Legacy" });
    expect(imported.courses["package-a@1.0.0"].classroom).toEqual({ record: "class" });
    expect((await loadPlatformLearnerEnvelope()).envelope.courses["package-a@1.0.0"].progress).toEqual(savedProgress);
  });

  it("keeps legacy raw apex backups importable without replacing the platform envelope contract", async () => {
    const imported = await importPlatformBackup('{"name":"Legacy learner","answered":{}}', "");
    expect(imported.legacyState).toMatchObject({ name: "Legacy learner", answered: {} });
    expect(imported.courses).toEqual({});
    expect((globalThis.localStorage as Storage).getItem(PLATFORM_LEARNER_KEY)).toBeNull();
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

  it("quarantines one malformed course slot while preserving and durably recovering other courses", async () => {
    const malformed = emptyPlatformLearnerEnvelope();
    const corruptProgress = { current: "broken", resumeMarker: "preserve-verbatim" };
    malformed.courses["bad.package@1.0.0"] = { progress: corruptProgress };
    malformed.courses["good.one@1.0.0"] = { progress: envelopeProgressFixture({ marker: "one" }) };
    malformed.courses["good.two@2.0.0"] = { progress: envelopeProgressFixture({ marker: "two" }) };
    let durable = malformed;
    const saves: typeof malformed[] = [];
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope: durable, recovered: false, persisted: true }),
      save: async envelope => { saves.push(envelope); durable = envelope; }
    });

    const snapshot = await store.hydrate();

    expect(snapshot).toMatchObject({
      phase: "ready",
      durability: "persisted",
      durableRevision: 1,
      recovered: false,
      quarantinedCourseNamespaces: ["bad.package@1.0.0"]
    });
    expect(snapshot.envelope?.courses["bad.package@1.0.0"]).not.toHaveProperty("progress");
    expect(snapshot.envelope?.courses["good.one@1.0.0"].progress).toMatchObject({ marker: "one" });
    expect(snapshot.envelope?.courses["good.two@2.0.0"].progress).toMatchObject({ marker: "two" });
    expect(snapshot.envelope?.quarantinedCourseProgress?.["bad.package@1.0.0"][0].rawProgress).toEqual(corruptProgress);
    expect(saves).toHaveLength(1);

    const mutation = await store.mutate(current => {
      const raw = current.quarantinedCourseProgress?.["bad.package@1.0.0"][0].rawProgress as Record<string, unknown>;
      raw.resumeMarker = "accidental-overwrite";
      return {
        ...current,
        quarantinedCourseProgress: {},
        courses: { ...current.courses, "good.one@1.0.0": { ...current.courses["good.one@1.0.0"], lecture: { cursor: "next" } } }
      };
    });
    expect(mutation.status).toBe("persisted");
    expect(durable.courses["good.one@1.0.0"].progress).toMatchObject({ marker: "one" });
    expect(durable.courses["good.two@2.0.0"].progress).toMatchObject({ marker: "two" });
    expect(durable.quarantinedCourseProgress?.["bad.package@1.0.0"][0].rawProgress).toEqual(corruptProgress);

    const reloaded = await new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope: durable, recovered: false, persisted: true }),
      save: vi.fn(async () => undefined)
    }).hydrate();
    expect(reloaded.durability).toBe("persisted");
    expect(reloaded.quarantinedCourseNamespaces).toEqual(["bad.package@1.0.0"]);
    expect(reloaded.envelope?.courses["good.two@2.0.0"].progress).toMatchObject({ marker: "two" });
  });

  it("uses installed course identity for quarantine while leaving content-version reconciliation intact", async () => {
    const saved = emptyPlatformLearnerEnvelope();
    saved.installedPackages = [
      { packageId: "course.identity", courseId: "course-current", courseVersion: "1.0.0", contentVersion: "content-new" },
      { packageId: "course.content", courseId: "course-stable", courseVersion: "2.0.0", contentVersion: "content-new" }
    ];
    saved.courses["course.identity@1.0.0"] = {
      progress: envelopeProgressFixture({ packageId: "course.identity", courseId: "wrong-course" })
    };
    saved.courses["course.content@2.0.0"] = {
      progress: envelopeProgressFixture({
        packageId: "course.content",
        courseId: "course-stable",
        courseVersion: "2.0.0",
        contentVersion: "content-old",
        resumeMarker: "kept-for-course-aware-reconciliation"
      })
    };
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope: saved, recovered: false, persisted: true }),
      save: async () => undefined
    });

    const snapshot = await store.hydrate();

    expect(snapshot.quarantinedCourseNamespaces).toEqual(["course.identity@1.0.0"]);
    expect(snapshot.envelope?.courses["course.content@2.0.0"].progress).toMatchObject({
      contentVersion: "content-old",
      resumeMarker: "kept-for-course-aware-reconciliation"
    });
  });

  it("keeps unsupported envelope schemas as explicit failures", async () => {
    const unsupported = { ...emptyPlatformLearnerEnvelope(), schemaVersion: 2 };
    const save = vi.fn(async () => undefined);
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope: unsupported, recovered: false, persisted: true }),
      save
    });
    await expect(store.hydrate()).rejects.toThrow("unsupported schema version");
    expect(store.getSnapshot()).toMatchObject({ phase: "failed", envelope: null, durability: "failed" });
    expect(save).not.toHaveBeenCalled();
  });

  it("quarantines progress with the wrong installed course identity but retains older content versions", async () => {
    const envelope = emptyPlatformLearnerEnvelope();
    envelope.installedPackages = [
      { packageId: "identity.bad", courseId: "course-right", courseVersion: "1.0.0", contentVersion: "content-2" },
      { packageId: "content.updated", courseId: "course-stable", courseVersion: "2.0.0", contentVersion: "content-2" }
    ];
    envelope.courses["identity.bad@1.0.0"] = {
      progress: envelopeProgressFixture({ packageId: "identity.bad", courseId: "course-wrong" })
    };
    envelope.courses["content.updated@2.0.0"] = {
      progress: envelopeProgressFixture({ packageId: "content.updated", courseId: "course-stable", courseVersion: "2.0.0", contentVersion: "content-1", resumeMarker: "preserve" })
    };
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope, recovered: false, persisted: true }),
      save: async () => undefined
    });

    const snapshot = await store.hydrate();

    expect(snapshot.quarantinedCourseNamespaces).toEqual(["identity.bad@1.0.0"]);
    expect(snapshot.envelope?.quarantinedCourseProgress?.["identity.bad@1.0.0"][0].reason).toContain("identity");
    expect(snapshot.envelope?.courses["content.updated@2.0.0"].progress).toMatchObject({
      contentVersion: "content-1",
      resumeMarker: "preserve"
    });
  });

  it("keeps recovered course records available after a failed quarantine save and retries durability", async () => {
    const malformed = emptyPlatformLearnerEnvelope();
    malformed.courses["bad@1"] = { progress: { invalid: true } };
    malformed.courses["good@1"] = { progress: envelopeProgressFixture({ marker: "available" }) };
    let durable = malformed;
    let failFirstSave = true;
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => ({ envelope: durable, recovered: false, persisted: true }),
      save: async envelope => {
        if (failFirstSave) {
          failFirstSave = false;
          throw new Error("quarantine disk failure");
        }
        durable = envelope;
      }
    });

    const recovered = await store.hydrate();
    expect(recovered).toMatchObject({ phase: "ready", durability: "failed", recovered: false });
    expect(recovered.envelope?.courses["good@1"].progress).toMatchObject({ marker: "available" });
    expect(recovered.envelope?.quarantinedCourseProgress?.["bad@1"][0].rawProgress).toEqual({ invalid: true });

    const retry = await store.retryPending();
    expect(retry.status).toBe("persisted");
    expect(store.getSnapshot()).toMatchObject({ durability: "persisted", durableRevision: 2 });
    expect(durable.quarantinedCourseProgress?.["bad@1"][0].rawProgress).toEqual({ invalid: true });
    expect(durable.courses["good@1"].progress).toMatchObject({ marker: "available" });
  });

  it("rejects malformed declared platform backups and unsupported schemas without touching either learner store", async () => {
    const values = globalThis.localStorage as Storage;
    const currentLegacy = JSON.stringify({ name: "Current learner", answered: { "aplus-q1": { correct: 2, attempts: 3 } } });
    const currentEnvelope = emptyPlatformLearnerEnvelope({ name: "Current learner" });
    const currentPlatform = JSON.stringify({
      schemaVersion: 1,
      courseId: "skillforge-platform",
      courseVersion: "1.0.0",
      contentVersion: "1",
      savedAt: "2026-10-09T00:00:00.000Z",
      payload: currentEnvelope
    });
    values.setItem("apex-state", currentLegacy);
    values.setItem(PLATFORM_LEARNER_KEY, currentPlatform);

    const malformed = emptyPlatformLearnerEnvelope({ name: "Replacement" });
    malformed.courses["broken@1"] = { progress: { nonsense: true } };
    const unsupported = { ...emptyPlatformLearnerEnvelope({ name: "Replacement" }), schemaVersion: 7 };
    const futureFormat = { ...emptyPlatformLearnerEnvelope({ name: "Replacement" }), format: "skillforge-platform-learner-v2", schemaVersion: 2 };
    const malformedLegacy = { ...emptyPlatformLearnerEnvelope({ name: "Replacement", answered: "invalid" }) };
    const malformedBackups = [malformed, unsupported, futureFormat, malformedLegacy];
    for (const backup of malformedBackups) {
      await expect(importPlatformBackup(JSON.stringify(backup), "")).rejects.toThrow();
      expect(values.getItem("apex-state")).toBe(currentLegacy);
      expect(values.getItem(PLATFORM_LEARNER_KEY)).toBe(currentPlatform);
      expect(values.getItem(PLATFORM_LEARNER_KEY + ":backup")).toBeNull();
    }
    await expect(importPlatformBackup("not-json", "")).rejects.toThrow("not valid JSON");
    expect(values.getItem("apex-state")).toBe(currentLegacy);
    expect(values.getItem(PLATFORM_LEARNER_KEY)).toBe(currentPlatform);
  });

  it("rolls back browser learner stores when a platform backup persistence step fails", async () => {
    const values = globalThis.localStorage as Storage & { setItem: Storage["setItem"] };
    const currentLegacy = JSON.stringify({ name: "Current learner", answered: {} });
    const currentPlatform = JSON.stringify({ schemaVersion: 1, courseId: "skillforge-platform", courseVersion: "1.0.0", contentVersion: "1", savedAt: "before", payload: emptyPlatformLearnerEnvelope({ name: "Current learner" }) });
    values.setItem("apex-state", currentLegacy);
    values.setItem(PLATFORM_LEARNER_KEY, currentPlatform);
    const originalSet = values.setItem.bind(values);
    let failImportWrite = true;
    values.setItem = (key: string, value: string) => {
      if (key === "apex-state" && value.includes("Replacement learner") && failImportWrite) {
        failImportWrite = false;
        throw new Error("simulated persistence failure");
      }
      originalSet(key, value);
    };
    const backup = emptyPlatformLearnerEnvelope({ name: "Replacement learner", answered: {} });
    backup.courses["good@1"] = { progress: envelopeProgressFixture({ marker: "valid" }) };

    await expect(importPlatformBackup(JSON.stringify(backup), "")).rejects.toThrow("simulated persistence failure");

    expect(values.getItem("apex-state")).toBe(currentLegacy);
    expect(values.getItem(PLATFORM_LEARNER_KEY)).toBe(currentPlatform);
    expect(values.getItem(PLATFORM_LEARNER_KEY + ":backup")).toBeNull();
  });
});
