import { describe, expect, it, vi } from "vitest";
import {
  emptyPlatformLearnerEnvelope,
  PlatformLearnerEnvelopeStore,
  type PlatformLearnerEnvelope,
  type PlatformLearnerEnvelopeAdapter,
  type PlatformLearnerLoad
} from "./persistence";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function loadResult(envelope = emptyPlatformLearnerEnvelope(), persisted = true): PlatformLearnerLoad {
  return { envelope, persisted, recovered: false };
}

// Envelope-shape fixture only; course-aware validity is tested with authored courses below.
function progressFixture(extra: Record<string, unknown> = {}) {
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

describe("canonical platform learner envelope owner", () => {
  it("waits for hydration before applying a mutation, preserving persisted progress against defaults", async () => {
    const load = deferred<PlatformLearnerLoad>();
    const saves: PlatformLearnerEnvelope[] = [];
    const adapter: PlatformLearnerEnvelopeAdapter = {
      load: () => load.promise,
      save: async envelope => { saves.push(envelope); }
    };
    const store = new PlatformLearnerEnvelopeStore(adapter, () => "2026-10-09T00:00:00.000Z");
    let mutatorRan = false;

    const mutation = store.mutate(current => {
      mutatorRan = true;
      return {
        ...current,
        courses: {
          ...current.courses,
          "new.course@1.0.0": { progress: progressFixture({ resume: "new" }) }
        }
      };
    });
    await Promise.resolve();
    expect(mutatorRan).toBe(false);
    expect(saves).toHaveLength(0);

    const persisted = emptyPlatformLearnerEnvelope();
    persisted.courses["existing.course@2.0.0"] = { progress: progressFixture({ resume: "persisted", completed: ["a"] }) };
    load.resolve(loadResult(persisted));
    const acknowledgement = await mutation;

    expect(acknowledgement.status).toBe("persisted");
    expect(saves).toHaveLength(1);
    expect(saves[0].courses["existing.course@2.0.0"].progress).toMatchObject({ resume: "persisted", completed: ["a"] });
    expect(saves[0].courses["new.course@1.0.0"].progress).toMatchObject({ resume: "new" });
  });

  it("hydrates once for overlapping callers and serializes mutation order", async () => {
    const firstSave = deferred<void>();
    const mutationOrder: string[] = [];
    const saved: PlatformLearnerEnvelope[] = [];
    let loadCount = 0;
    const adapter: PlatformLearnerEnvelopeAdapter = {
      load: async () => { loadCount += 1; return loadResult(emptyPlatformLearnerEnvelope(), false); },
      save: async envelope => {
        saved.push(envelope);
        if (saved.length === 1) await firstSave.promise;
      }
    };
    const store = new PlatformLearnerEnvelopeStore(adapter);
    await Promise.all([store.hydrate(), store.hydrate()]);
    expect(loadCount).toBe(1);

    const first = store.mutate(current => {
      mutationOrder.push("first");
      return { ...current, courses: { ...current.courses, "one@1": { progress: progressFixture({ first: true }) } } };
    });
    const second = store.mutate(current => {
      mutationOrder.push("second");
      return {
        ...current,
        courses: {
          ...current.courses,
          "two@1": { progress: progressFixture({ second: true }) }
        }
      };
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mutationOrder).toEqual(["first"]);
    expect(saved).toHaveLength(1);
    firstSave.resolve();
    expect((await first).status).toBe("persisted");
    expect((await second).status).toBe("persisted");

    expect(mutationOrder).toEqual(["first", "second"]);
    expect(saved).toHaveLength(2);
    expect(saved[1].courses["one@1"].progress).toMatchObject({ first: true });
    expect(saved[1].courses["two@1"].progress).toMatchObject({ second: true });
  });

  it("surfaces a failed save and distinguishes memory state from durable state", async () => {
    const original = emptyPlatformLearnerEnvelope();
    original.courses["course@1"] = { progress: progressFixture({ saved: true }) };
    let durable = original;
    let fail = true;
    const adapter: PlatformLearnerEnvelopeAdapter = {
      load: async () => loadResult(original),
      save: async envelope => {
        if (fail) throw new Error("simulated disk failure");
        durable = envelope;
      }
    };
    const store = new PlatformLearnerEnvelopeStore(adapter);
    await store.hydrate();

    const failed = await store.mutate(current => ({
      ...current,
      courses: { ...current.courses, "course@1": { progress: progressFixture({ session: true }) } }
    }));
    expect(failed).toMatchObject({ status: "failed", error: "simulated disk failure" });
    expect(store.getSnapshot().envelope?.courses["course@1"].progress).toMatchObject({ session: true });
    expect(store.getSnapshot().durability).toBe("failed");
    expect(durable.courses["course@1"].progress).toMatchObject({ saved: true });

    fail = false;
    expect((await store.retryPending()).status).toBe("persisted");
    expect(store.getSnapshot().durability).toBe("persisted");
    expect(durable.courses["course@1"].progress).toMatchObject({ session: true });
  });

  it("loads schema-1 data, preserves multiple course namespaces and compatible unknown fields", async () => {
    const legacy = emptyPlatformLearnerEnvelope({ compatibility: "kept" });
    legacy.extraCompatibleField = { opaque: true };
    legacy.installedPackages = [{
      packageId: "package.one",
      courseId: "course-one",
      courseVersion: "1.0.0",
      contentVersion: "content-1",
      packageVersion: "1.0.0",
      unknownIdentityField: "preserved"
    }];
    legacy.courses["package.one@1.0.0"] = {
      progress: progressFixture({ completed: ["activity"] }),
      classroom: { session: "paused" },
      lecture: { cursor: "segment-2" },
      labs: { run: "active" },
      unknownCourseField: { value: "preserved" }
    };
    legacy.courses["package.two@4.0.0"] = { progress: progressFixture({ resumeMarker: "lesson-2" }) };
    let durable = legacy;
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => loadResult(legacy),
      save: async envelope => { durable = envelope; }
    });

    await store.hydrate();
    const acknowledgement = await store.mutate(current => ({
      ...current,
      courses: { ...current.courses, "package.three@1.0.0": { progress: progressFixture({ resumeMarker: "lesson-3" }) } }
    }));

    expect(acknowledgement.status).toBe("persisted");
    expect(durable.schemaVersion).toBe(1);
    expect(durable.legacyState).toEqual({ compatibility: "kept" });
    expect(durable.extraCompatibleField).toEqual({ opaque: true });
    expect(durable.installedPackages[0].unknownIdentityField).toBe("preserved");
    expect(durable.courses["package.one@1.0.0"].lecture).toEqual({ cursor: "segment-2" });
    expect(durable.courses["package.one@1.0.0"].labs).toEqual({ run: "active" });
    expect(durable.courses["package.one@1.0.0"].unknownCourseField).toEqual({ value: "preserved" });
    expect(durable.courses["package.two@4.0.0"].progress).toMatchObject({ resumeMarker: "lesson-2" });
    expect(durable.courses["package.three@1.0.0"].progress).toMatchObject({ resumeMarker: "lesson-3" });
  });

  it("fails hydration on conflicting package identities without saving defaults", async () => {
    const conflicting = emptyPlatformLearnerEnvelope();
    conflicting.installedPackages = [
      { packageId: "same.package", courseId: "course-a", courseVersion: "1", contentVersion: "a" },
      { packageId: "same.package", courseId: "course-b", courseVersion: "2", contentVersion: "b" }
    ];
    const save = vi.fn(async () => undefined);
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => loadResult(conflicting),
      save
    });

    await expect(store.hydrate()).rejects.toThrow("conflicting package identities");
    expect(store.getSnapshot().phase).toBe("failed");
    expect(store.getSnapshot().envelope).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("flush waits for pending mutations and returns the durable acknowledgment", async () => {
    const saveGate = deferred<void>();
    let persisted = false;
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => loadResult(emptyPlatformLearnerEnvelope(), false),
      save: async () => { await saveGate.promise; persisted = true; }
    });
    const mutation = store.mutate(current => ({
      ...current,
      courses: { ...current.courses, "course@1": { progress: progressFixture({ saved: true }) } }
    }));
    await vi.waitFor(() => expect(store.getSnapshot().durability).toBe("pending"));

    let flushFinished = false;
    const flush = store.flush(2000).then(result => { flushFinished = true; return result; });
    await Promise.resolve();
    expect(flushFinished).toBe(false);
    saveGate.resolve();
    await mutation;
    await expect(flush).resolves.toMatchObject({ status: "persisted" });
    expect(persisted).toBe(true);
  });

  it("bounds shutdown flush time and reports pending durability", async () => {
    const saveGate = deferred<void>();
    const store = new PlatformLearnerEnvelopeStore({
      load: async () => loadResult(emptyPlatformLearnerEnvelope(), false),
      save: async () => { await saveGate.promise; }
    });
    const mutation = store.mutate(current => ({
      ...current,
      courses: { ...current.courses, "course@1": { progress: progressFixture({ saved: true }) } }
    }));
    await vi.waitFor(() => expect(store.getSnapshot().durability).toBe("pending"));

    await expect(store.flush(10)).resolves.toMatchObject({
      status: "pending",
      error: "Platform learner-state flush timed out."
    });
    saveGate.resolve();
    await mutation;
  });
  it("keeps PlatformHub free of independent envelope read/merge/write calls", () => {
    const source = import.meta.glob("./PlatformHub.tsx", { query: "?raw", import: "default", eager: true })["./PlatformHub.tsx"] as string;
    expect(source).toContain("getPlatformLearnerEnvelopeStore");
    expect(source).not.toContain("loadPlatformLearnerEnvelope");
    expect(source).not.toContain("saveCourseProgressInPlatformEnvelope");
    expect(source).not.toMatch(/void\s+save[A-Za-z]+InPlatformEnvelope/);
  });
  it("wires native close to the tested bounded canonical shutdown handler", () => {
    const appSource = import.meta.glob("../App.tsx", { query: "?raw", import: "default", eager: true })["../App.tsx"] as string;
    expect(appSource).toContain("onCloseRequested(createLearnerStateCloseHandler");
    expect(appSource).toContain("getPlatformLearnerEnvelopeStore().flush(5000)");
    expect(appSource).toContain("currentWindow.destroy()");
    expect(appSource).toContain("recordDiagnosticError(`platform_learner_shutdown_${stage}`, error)");
    expect(appSource).toContain("console.error(`SkillForge learner-state shutdown ${stage} failed.`, error)");
  });
});
