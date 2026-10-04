import { beforeEach, describe, expect, it } from "vitest";
import { emptyPlatformLearnerEnvelope, exportPlatformBackup, importPlatformBackup, isPlatformLearnerEnvelope, loadPlatformLearnerEnvelope, savePlatformLearnerEnvelope } from "./persistence";
import { resetLearnerStateStoreForTests } from "../state/learnerState";

function installBrowserStorage(): Map<string, string> {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } as unknown as Storage;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  resetLearnerStateStoreForTests();
  return values;
}

describe("unified platform learner persistence", () => {
  beforeEach(() => installBrowserStorage());

  it("stores a versioned envelope with isolated course, classroom, lecture, and lab slots", async () => {
    const envelope = emptyPlatformLearnerEnvelope({ schemaVersion: 3, activeCertId: "a-plus" });
    envelope.installedPackages = [{ packageId: "fixture.package", courseId: "fixture-course", courseVersion: "1.0.0", contentVersion: "fixture-1" }];
    envelope.courses["fixture.package@1.0.0"] = { progress: { completed: ["activity-1"] }, classroom: { session: "paused" }, lecture: { cursor: "segment-2" }, labs: { run: "active" } };
    await savePlatformLearnerEnvelope(envelope);
    const loaded = await loadPlatformLearnerEnvelope();
    expect(isPlatformLearnerEnvelope(loaded.envelope)).toBe(true);
    expect(loaded.envelope.legacyState).toEqual({ schemaVersion: 3, activeCertId: "a-plus" });
    expect(loaded.envelope.courses["fixture.package@1.0.0"].lecture).toEqual({ cursor: "segment-2" });
    expect(loaded.envelope.courses["fixture.package@1.0.0"].labs).toEqual({ run: "active" });
  });

  it("round-trips the new platform envelope through encrypted backup export/import", async () => {
    const envelope = emptyPlatformLearnerEnvelope({ name: "Legacy" });
    envelope.courses["package-a@1.0.0"] = { progress: { current: "a" }, classroom: { record: "class" } };
    await savePlatformLearnerEnvelope(envelope);
    const raw = await exportPlatformBackup({ name: "Legacy" }, "platform-passphrase");
    installBrowserStorage();
    const imported = await importPlatformBackup(raw, "platform-passphrase");
    expect(imported.legacyState).toEqual({ name: "Legacy" });
    expect(imported.courses["package-a@1.0.0"].classroom).toEqual({ record: "class" });
    expect((await loadPlatformLearnerEnvelope()).envelope.courses["package-a@1.0.0"].progress).toEqual({ current: "a" });
  });

  it("keeps legacy raw apex backups importable without replacing the platform envelope contract", async () => {
    const imported = await importPlatformBackup('{"name":"Legacy learner","answered":{}}', "");
    expect(imported.format).toBe("skillforge-platform-learner");
    expect(imported.legacyState).toEqual({ name: "Legacy learner", answered: {} });
    expect(imported.courses).toEqual({});
  });
});
