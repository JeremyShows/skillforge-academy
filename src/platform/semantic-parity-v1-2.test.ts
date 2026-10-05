import { describe, expect, it } from "vitest";
import { applyAuthoredActivityResponse, createCourseProgress, createCourseRuntimeContext, evaluateAuthoredActivityResponse, packageToCourse } from "./runtime";
import type { CoursePackageDocument } from "./packageTypes";
import { validateCoursePackage } from "./packageValidation";
import schema from "../../schemas/skillforge-course-v1.schema.json";

export const fixture: CoursePackageDocument = {
  manifest: { format: "skillforge-course", formatVersion: 1, packageId: "fixture.semantic.v12", packageVersion: "2.0.0", courseId: "fixture-semantic", courseVersion: "3.0.0", contentVersion: "semantic-3", title: "Semantic fixture", description: "Neutral parity fixture", capabilities: ["lecture-delivery", "deterministic-labs"] },
  course: {
    id: "fixture-semantic", title: "Semantic fixture", description: "Neutral parity fixture", units: [{ id: "unit-1", title: "Unit", description: "Unit", masteryRequirements: ["mastery"], moduleAssessment: { id: "module-assessment", title: "Module", instructions: "Integrate", source: { unitId: "unit-1", lessonId: "lesson-1", activityId: "gate" }, rubric: ["evidence"], sourceActivityIds: ["gate"], passScore: 0.75, finalIntegration: true }, lessons: [{ id: "lesson-1", title: "Lesson", summary: "Summary", objectives: ["Explain"], activities: [{ id: "intro", type: "instruction", title: "Intro", estimatedMinutes: 2, body: "Read this." }, { id: "remediate", type: "remediation", title: "Repair", estimatedMinutes: 2, body: "Repair.", prompt: "Explain the missing evidence.", returnToActivityId: "gate", successSignal: "A response is present." }, { id: "gate", type: "mastery_check", title: "Gate", estimatedMinutes: 5, prompt: "Explain the evidence.", body: "Use the authored criterion.", passScore: 0.5, masteryRubric: [{ id: "evidence", description: "Evidence", required: true, evidence: "self-assessed", keywords: ["evidence"] }] }], masteryRule: { gateActivityId: "gate", criteria: [{ id: "evidence", description: "Evidence", required: true, evidence: "self-assessed", keywords: ["evidence"] }], passScore: 0.5, requiredActivityIds: ["intro", "gate"], retryPolicy: "remediate-then-retry", remediationActivityId: "remediate" } }] }], capstone: { id: "capstone", title: "Capstone", instructions: "Final", source: { unitId: "unit-1", lessonId: "lesson-1", activityId: "gate" }, rubric: ["final"], passScore: 0.8, finalIntegration: true }, finalAssessment: { id: "final", title: "Final", instructions: "Final", source: { unitId: "unit-1", lessonId: "lesson-1", activityId: "gate" }, rubric: ["final"], passScore: 0.7, finalIntegration: true }
  },
  lectures: { version: "1.0.0", lectures: [{ id: "lecture-1", title: "Lecture", version: "1.0.0", unitId: "unit-1", lessonIds: ["lesson-1"], segments: [{ id: "diagram", kind: "diagram", title: "Diagram", body: "Equivalent", authoredContent: { diagram: "A -> B" }, interaction: { responseType: "question", prompt: "Choose", options: ["A", "B"] }, source: { unitId: "unit-1", lessonId: "lesson-1", activityId: "intro" }, references: ["authored-ref"], required: true }] }] },
  labs: { version: "1.0.0", runtimeVersion: "deterministic-local-v1", courseId: "fixture-semantic", labs: [{ id: "lab-1", number: 7, title: "Lab", purpose: "State", unitId: "unit-1", required: true, initialState: { log: "" }, actions: [{ id: "append", label: "Append", instruction: "Append", effects: [{ key: "log", operation: "append", value: "ok" }] }], checks: [], steps: [{ id: "formal", number: 1, title: "Formal", kind: "formal-activity", instruction: "Respond", unitId: "unit-1", required: true, formalActivityId: "gate" }], requiredStepIds: ["formal"] }] }
};

describe("V1.2 semantic parity closure", () => {
  it("round-trips authored mastery, assessment, lecture, and lab semantics", () => {
    const course = packageToCourse(fixture);
    expect(course.modules[0].lessons[0].masteryRule).toMatchObject({ passScore: 0.5, requiredActivityIds: ["intro", "gate"], retryPolicy: "remediate-then-retry" });
    expect(course.modules[0].moduleAssessment).toMatchObject({ passScore: 0.75, finalIntegration: true });
    expect(course.capstone).toMatchObject({ passScore: 0.8, finalIntegration: true });
    const context = createCourseRuntimeContext(fixture);
    expect(context.lectures?.lectures[0].segments[0].authoredContent?.kind).toBe("diagram");
    expect(context.lectures?.lectures[0].segments[0].expectedInteraction).toBe("question");
    expect(context.labs?.labs[0]).toMatchObject({ number: 7, required: true });
  });

  it("does not complete a formal activity when it is opened or submitted without authored evidence", () => {
    const context = createCourseRuntimeContext(fixture);
    const location = { moduleId: "unit-1", lessonId: "lesson-1", activityId: "gate" };
    const progress = createCourseProgress(context);
    expect(evaluateAuthoredActivityResponse(context, location, "").passed).toBe(false);
    expect(applyAuthoredActivityResponse(context, progress, location, "").lessonProgress["lesson-1"].completedActivityIds).not.toContain("gate");
    expect(applyAuthoredActivityResponse(context, progress, location, "wrong").current.activityId).toBe("remediate");
    expect(applyAuthoredActivityResponse(context, progress, location, "evidence").lessonProgress["lesson-1"].completedActivityIds).toContain("gate");
  });

  it("keeps the canonical schema and runtime validator strict on the same named surfaces", () => {
    const defs = schema.$defs as Record<string, { additionalProperties?: boolean }>;
    expect(schema.additionalProperties).toBe(false);
    for (const name of ["instructor", "activity", "masteryRule", "assessment", "lectureSegment", "academic", "labCatalog", "asset", "migration"]) expect(defs[name].additionalProperties).toBe(false);
    const unknownMode = { ...fixture, instructor: { id: "teacher", displayRole: "Teacher", subjectScope: "Systems", pedagogicalInstructions: ["Bounded"], allowedModes: ["EXPLAIN"], fallbackLanguage: "English" } };
    expect(validateCoursePackage(unknownMode).errors.join(" ")).toContain("canonical InstructorMode");
    const unknownAsset = { ...fixture, assets: [{ id: "asset", kind: "text", label: "Text", mediaType: "text/plain", byteLength: 1, unexpected: true }] } as unknown as CoursePackageDocument;
    expect(validateCoursePackage(unknownAsset).errors.join(" ")).toContain("unknown field");
  });
});
