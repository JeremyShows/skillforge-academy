import { describe, expect, it } from "vitest";
import { applyAuthoredActivityResponse, createCourseProgress, createCourseRuntimeContext, evaluateAuthoredActivityResponse, packageToCourse } from "./runtime";
import type { CoursePackageDocument } from "./packageTypes";
import { validateCoursePackage } from "./packageValidation";

export const fixture: CoursePackageDocument = {
  manifest: { format: "skillforge-course", formatVersion: 1, packageId: "fixture.semantic.v13", packageVersion: "2.0.0", courseId: "fixture-semantic", courseVersion: "3.0.0", contentVersion: "semantic-3", title: "Semantic fixture", description: "Neutral parity fixture", capabilities: ["lecture-delivery", "deterministic-labs"] },
  course: {
    id: "fixture-semantic", version: "3.0.0", contentVersion: "semantic-3", title: "Semantic fixture", subtitle: "Parity", description: "Neutral parity fixture", subject: "Systems", level: "intermediate", audience: "Learners", prerequisites: [], prerequisiteConceptIds: [], outcomes: ["Explain"], estimatedTotalMinutes: 20,
    modules: [{ id: "unit-1", title: "Unit", summary: "Unit", learningOutcomes: ["Mastery"], prerequisiteModuleIds: [], lessons: [{ id: "lesson-1", title: "Lesson", summary: "Summary", objectives: ["Explain"], estimatedMinutes: 9, prerequisiteKnowledge: [], prerequisiteLessonIds: [], conceptIds: ["evidence"], externalPrerequisites: [], activities: [{ id: "intro", type: "instruction", title: "Intro", estimatedMinutes: 2, body: "Read this.", keyPoints: ["Evidence"], required: true }, { id: "remediate", type: "remediation", title: "Repair", estimatedMinutes: 2, body: "Repair.", practicePrompt: "Explain the missing evidence.", returnToActivityId: "gate", successSignal: "A response is present.", required: false }, { id: "gate", type: "mastery_check", title: "Gate", estimatedMinutes: 5, prompt: "Explain the evidence.", expectedAnswer: "Evidence", passScore: 0.5, explanation: "Use the authored criterion.", rubric: { requiredConcepts: [{ id: "evidence", label: "Evidence", required: true, keywords: ["evidence"] }] }, required: true }], masteryRule: { gateActivityId: "gate", passScore: 0.5, requiredActivityIds: ["intro", "gate"], retryPolicy: "remediate-then-retry" }, remediationActivityId: "remediate", references: [], tags: ["fixture"] }], estimatedMinutes: 9, masteryRequirements: ["mastery"], moduleAssessment: { id: "module-assessment", title: "Module", description: "Integrate", activityIds: ["gate"], passScore: 0.75, finalIntegration: true, rubric: { requiredConcepts: [{ id: "evidence", label: "Evidence", required: true, keywords: ["evidence"] }] } } }], optionalResources: [], capstone: { id: "capstone", title: "Capstone", description: "Final", activityIds: ["gate"], passScore: 0.8, finalIntegration: true }, finalAssessment: { id: "final", title: "Final", description: "Final", activityIds: ["gate"], passScore: 0.7, finalIntegration: true }, metadata: { author: "Fixture", source: "test", tags: ["fixture"] }, visibility: "local", type: "course"
  },
  lectures: { courseId: "fixture-semantic", version: "1.0.0", explicitLectureIds: ["lecture-1"], lectures: [{ id: "lecture-1", title: "Lecture", version: "1.0.0", courseId: "fixture-semantic", moduleId: "unit-1", lessonIds: ["lesson-1"], abstract: "Lecture", objectives: ["Explain"], prerequisiteConceptIds: [], estimatedMinutes: 1, references: ["authored-ref"], tags: ["fixture"], explicit: true, segments: [{ id: "diagram", type: "DIAGRAM", title: "Diagram", conceptIds: ["evidence"], authoredContent: { kind: "diagram", label: "A to B", nodes: ["A", "B"], edges: ["A -> B"], textEquivalent: "A leads to B" }, expectedInteraction: "question", prompt: "Choose", estimatedMinutes: 1, required: true }] }] },
  labs: { version: "1.0.0", runtimeVersion: "deterministic-local-v1", courseId: "fixture-semantic", labs: [{ id: "lab-1", number: 7, courseId: "fixture-semantic", moduleId: "unit-1", unitId: "unit-1", title: "Lab", purpose: "State", learningObjective: "Preserve state", estimatedMinutes: 10, required: true, sourceLocations: [], environment: { kind: "simulated-system", description: "Bounded", capabilities: [], prohibitedCapabilities: ["network"] }, initialState: { log: "" }, actions: [{ id: "append", label: "Append", instruction: "Append", effects: [{ key: "log", operation: "append", value: "ok" }] }], checks: [], steps: [{ id: "formal", number: 1, title: "Formal", kind: "formal-activity", instruction: "Respond", required: true, formalActivityId: "gate" }], requiredStepIds: ["formal"], reflectionPrompts: [], instructorNote: "" }] }
};

describe("V1.3 canonical authored model parity", () => {
  it("round-trips authored mastery, assessment, lecture, and lab semantics without projection", () => {
    const course = packageToCourse(fixture);
    expect(course).toBe(fixture.course);
    expect(course.modules[0].lessons[0].masteryRule).toMatchObject({ passScore: 0.5, requiredActivityIds: ["intro", "gate"], retryPolicy: "remediate-then-retry" });
    expect(course.modules[0].moduleAssessment).toMatchObject({ passScore: 0.75, finalIntegration: true });
    expect(course.capstone).toMatchObject({ passScore: 0.8, finalIntegration: true });
    const context = createCourseRuntimeContext(fixture);
    expect(context.lectures?.lectures[0].segments[0].authoredContent?.kind).toBe("diagram");
    expect(context.lectures?.lectures[0].segments[0].expectedInteraction).toBe("question");
    expect(context.labs?.labs[0]).toMatchObject({ number: 7, required: true });
  });

  it("does not complete a formal activity without authored evidence", () => {
    const context = createCourseRuntimeContext(fixture); const location = { moduleId: "unit-1", lessonId: "lesson-1", activityId: "gate" }; const progress = createCourseProgress(context);
    expect(evaluateAuthoredActivityResponse(context, location, "").passed).toBe(false);
    expect(applyAuthoredActivityResponse(context, progress, location, "").lessonProgress["lesson-1"].completedActivityIds).not.toContain("gate");
    expect(applyAuthoredActivityResponse(context, progress, location, "wrong").current.activityId).toBe("remediate");
    expect(applyAuthoredActivityResponse(context, progress, location, "evidence").lessonProgress["lesson-1"].completedActivityIds).toContain("gate");
  });

  it("rejects unknown canonical enums and package fields", () => {
    const unknownMode = { ...fixture, instructor: { id: "teacher", displayRole: "Teacher", subjectScope: "Systems", pedagogicalInstructions: ["Bounded"], allowedModes: ["EXPLAIN"], fallbackLanguage: "English" } };
    expect(validateCoursePackage(unknownMode).errors.join(" ")).toContain("canonical InstructorMode");
    const unknownAsset = { ...fixture, assets: [{ id: "asset", kind: "text", label: "Text", mediaType: "text/plain", byteLength: 1, unexpected: true }] } as unknown as CoursePackageDocument;
    expect(validateCoursePackage(unknownAsset).errors.join(" ")).toContain("unknown field");
    const unknownActivity = structuredClone(fixture); (unknownActivity.course.modules[0].lessons[0].activities[0] as unknown as Record<string, unknown>).type = "future_activity";
    expect(validateCoursePackage(unknownActivity).errors.join(" ")).toContain("type is unknown");
  });
});
