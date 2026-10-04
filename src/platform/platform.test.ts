import { describe, expect, it } from "vitest";
import { bundledContent } from "../content";
import { buildPublicPackages } from "./publicPackages";
import { CourseRegistry } from "./registry";
import { completeAuthoredActivity, createCourseRuntimeContext, deterministicInstructorFallback, enrollCourse, loadCourseProgress, saveCourseProgress } from "./runtime";
import { parseCoursePackage, serializeCoursePackage, validateCoursePackage } from "./packageValidation";
import type { CoursePackageDocument } from "./packageTypes";

const packages = buildPublicPackages(bundledContent);
const aPlus = packages.find(item => item.manifest.courseId === "a-plus") as CoursePackageDocument;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

describe("course package contract", () => {
  it("validates every built-in public package", () => {
    expect(packages).toHaveLength(3);
    packages.forEach(document => expect(validateCoursePackage(document).errors).toEqual([]));
  });

  it("rejects duplicate package IDs and unsupported format versions", () => {
    const duplicate = clone(aPlus);
    duplicate.manifest.packageId = "builtin.a-plus";
    const registry = new CourseRegistry(packages, undefined);
    expect(registry.install(duplicate).errors.join(" ")).toContain("already provided");
    const unsupported = clone(aPlus);
    unsupported.manifest.formatVersion = 99 as 1;
    expect(validateCoursePackage(unsupported).errors.join(" ")).toContain("unsupported");
  });

  it("rejects mismatched and broken references", () => {
    const mismatch = clone(aPlus);
    mismatch.course.id = "other-course";
    expect(validateCoursePackage(mismatch).errors.join(" ")).toContain("match manifest.courseId");
    const broken = clone(aPlus);
    broken.readings![0].source.lessonId = "missing-lesson";
    expect(validateCoursePackage(broken).errors.join(" ")).toContain("unknown lesson");
    const brokenLecture = clone(aPlus);
    brokenLecture.lectures = { version: "1.0.0", lectures: [{ id: "lecture", title: "Lecture", version: "1.0.0", unitId: brokenLecture.course.units[0].id, lessonIds: ["missing-lesson"], segments: [] }] };
    expect(validateCoursePackage(brokenLecture).errors.join(" ")).toContain("unknown lesson");
    const brokenLab = clone(aPlus);
    brokenLab.labs = { version: "1.0.0", runtimeVersion: "deterministic-local-v1", courseId: aPlus.course.id, labs: [{ id: "lab", title: "Lab", purpose: "Test", unitId: aPlus.course.units[0].id, initialState: {}, actions: [], checks: [], steps: [{ id: "step", number: 1, title: "Action", kind: "action", instruction: "Test", unitId: aPlus.course.units[0].id, required: true, actionIds: ["missing-action"] }], requiredStepIds: ["step"] }] };
    expect(validateCoursePackage(brokenLab).errors.join(" ")).toContain("unknown action");
    expect(aPlus.lectures).toBeUndefined();
    expect(aPlus.labs).toBeUndefined();
  });

  it("rejects adversarial cross-wired hierarchy tuples across authored surfaces", () => {
    const firstUnit = aPlus.course.units[0];
    const secondUnit = aPlus.course.units[1];
    const firstLesson = firstUnit.lessons[0];
    const secondLesson = secondUnit.lessons[0];
    const firstActivity = firstLesson.activities[0];
    const secondActivity = secondLesson.activities[0];
    const crossLocation = { unitId: firstUnit.id, lessonId: secondLesson.id, activityId: secondActivity.id };

    const reading = clone(aPlus);
    reading.readings = [{ id: "cross-reading", title: "Cross", body: "Cross", source: crossLocation, required: true }];
    expect(validateCoursePackage(reading).errors.join(" ")).toContain("invalid lesson relationship");

    const assignment = clone(aPlus);
    assignment.assignments = [{ id: "cross-assignment", title: "Cross", instructions: "Cross", source: crossLocation, sourceActivityIds: [secondActivity.id], required: true }];
    expect(validateCoursePackage(assignment).errors.join(" ")).toContain("invalid lesson relationship");

    const assessment = clone(aPlus);
    assessment.assessments = [{ id: "cross-assessment", title: "Cross", instructions: "Cross", source: crossLocation, sourceActivityIds: [secondActivity.id], rubric: [], required: true }];
    expect(validateCoursePackage(assessment).errors.join(" ")).toContain("invalid lesson relationship");

    const lecture = clone(aPlus);
    lecture.lectures = { version: "1.0.0", lectures: [{ id: "cross-lecture", title: "Cross", version: "1.0.0", unitId: firstUnit.id, lessonIds: [secondLesson.id], segments: [] }] };
    expect(validateCoursePackage(lecture).errors.join(" ")).toContain("invalid lesson relationship");

    const lab = clone(aPlus);
    lab.labs = { version: "1.0.0", runtimeVersion: "deterministic-local-v1", courseId: aPlus.course.id, labs: [{ id: "cross-lab", title: "Cross", purpose: "Cross", unitId: firstUnit.id, sourceLocation: crossLocation, initialState: {}, actions: [], checks: [], steps: [{ id: "cross-step", number: 1, title: "Cross", kind: "briefing", instruction: "Cross", unitId: firstUnit.id, sourceLocation: crossLocation, required: true }], requiredStepIds: ["cross-step"] }] };
    expect(validateCoursePackage(lab).errors.join(" ")).toContain("invalid lesson relationship");

    expect(firstActivity.id).not.toBe(secondActivity.id);
  });

  it("rejects executable, path, secret, and oversized package fields", () => {
    const executable = clone(aPlus) as CoursePackageDocument & { command?: string };
    executable.command = "powershell -Command whoami";
    expect(validateCoursePackage(executable).errors.join(" ")).toContain("not allowed");
    const secret = clone(aPlus) as CoursePackageDocument & { metadata?: { apiKey: string } };
    secret.metadata = { apiKey: "sk-123456789012345678901234" };
    expect(validateCoursePackage(secret).errors.join(" ")).toContain("secret-shaped");
    const oversized = clone(aPlus);
    oversized.course.description = "x".repeat(2_000_001);
    expect(validateCoursePackage(oversized).errors.join(" ")).toContain("exceeds");
  });

  it("serializes deterministically and round-trips", () => {
    const first = serializeCoursePackage(aPlus);
    const second = serializeCoursePackage(clone(aPlus));
    expect(first).toBe(second);
    const parsed = parseCoursePackage(first);
    expect(parsed.report.errors).toEqual([]);
    expect(parsed.document?.manifest.packageId).toBe("builtin.a-plus");
  });

  it("reports unsupported capabilities without executing them", () => {
    const future = clone(aPlus);
    future.manifest.packageId = "example.future";
    future.manifest.courseId = "example-future";
    future.course.id = "example-future";
    future.manifest.capabilities = ["network-simulation"];
    const registry = new CourseRegistry(packages, undefined);
    const result = registry.install(future);
    expect(result.installed).toBe(false);
    expect(result.unsupportedCapabilities).toEqual(["network-simulation"]);
  });
});

describe("generic runtime and registry", () => {
  it("installs, updates, exports, and removes a local package while preserving progress", () => {
    const registry = new CourseRegistry(packages, undefined);
    const imported = clone(aPlus);
    imported.manifest.packageId = "local.example.course";
    imported.manifest.courseId = "local-example-course";
    imported.course.id = "local-example-course";
    imported.manifest.visibilityMetadata = { audience: "local" };
    if (imported.labs) imported.labs.courseId = "local-example-course";
    const installed = registry.install(imported);
    expect(installed.installed).toBe(true);
    expect(registry.packageById("local.example.course")?.manifest.courseId).toBe("local-example-course");
    const update = clone(imported);
    update.manifest.packageVersion = "1.2.0";
    update.manifest.title = "Updated Local Course";
    expect(registry.install(update)).toMatchObject({ installed: true, updated: true });
    expect(registry.packageById("local.example.course")?.manifest.title).toBe("Updated Local Course");
    expect(registry.install(imported).errors.join(" ")).toContain("higher packageVersion");
    expect(registry.export("local.example.course")).toContain("local.example.course");
    expect(registry.remove("local.example.course", true)).toEqual({ removed: true, archivedProgress: true });
  });

  it("keeps progress isolated by package/course namespace", () => {
    const first = createCourseRuntimeContext(aPlus);
    const second = createCourseRuntimeContext(packages.find(item => item.manifest.courseId === "network-plus")!);
    let map = enrollCourse({}, first, "2026-10-04T12:00:00Z");
    map = enrollCourse(map, second, "2026-10-04T12:00:00Z");
    const firstProgress = map[first.progressNamespace];
    const secondProgress = map[second.progressNamespace];
    expect(first.progressNamespace).not.toBe(second.progressNamespace);
    const location = firstProgress.current;
    const advanced = completeAuthoredActivity(first, firstProgress, location);
    expect(advanced.lessonProgress[location.lessonId].completedActivityIds).toContain(location.activityId);
    expect(secondProgress.completedLessonIds).toEqual([]);
  });

  it("uses provider-neutral deterministic instructor fallback", () => {
    const context = createCourseRuntimeContext(aPlus);
    const response = deterministicInstructorFallback(context, "TEACH", "What should I review?");
    expect(response.basis).toBe("fallback");
    expect(response.canChangeProgress).toBe(false);
    expect(response.message).not.toContain("private");
  });

  it("does not collide with the legacy learner state storage key", () => {
    const storage = new Map<string, string>();
    const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } as unknown as Storage;
    saveCourseProgress({}, adapter);
    expect(storage.has("skillforge-course-progress-v1")).toBe(true);
    expect(storage.has("apex-state")).toBe(false);
    expect(loadCourseProgress(adapter)).toEqual({});
  });
});
