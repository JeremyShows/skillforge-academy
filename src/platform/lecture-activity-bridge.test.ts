import { describe, expect, it } from "vitest";
import { applyAuthoredActivityResponse, completeAuthoredActivity, createCourseProgress, createCourseRuntimeContext, isFormalActivity } from "./runtime";
import type { CourseActivity, CourseLocation } from "../course/types";
import { advanceLectureSegment, createLectureRunState, lectureCompletionLabel, segmentPresentationKind } from "../lecture/runtime";
import type { LectureDefinition, LectureSegment } from "../lecture/types";
import type { CoursePackageDocument } from "./packageTypes";
import { applyLectureActivityResponse, LECTURE_ACTIVITY_RESOLUTION_ERROR, resolveLectureActivity } from "./lectureActivityBridge";

const location = (activityId: string): CourseLocation => ({ moduleId: "unit-bridge", lessonId: "lesson-bridge", activityId });

function activity(id: string, type: CourseActivity["type"]): CourseActivity {
  const base = { id, title: `Fixture ${id}`, estimatedMinutes: 2, required: !["repair", "module-assessment", "capstone"].includes(id), objectiveIds: ["objective-signal"] };
  if (type === "instruction" || type === "concept_explanation") return { ...base, type, body: "A neutral authored explanation.", keyPoints: ["signal"] };
  if (type === "guided_practice" || type === "scenario") return { ...base, type, prompt: "Explain the authored signal.", expectedReasoning: ["signal"], responseRequired: true, responseType: "text", responsePrompt: "What signal would you verify?", pedagogicalRole: type === "guided_practice" ? "guided" : "transfer" };
  if (type === "remediation") return { ...base, type, body: "Review the authored signal.", practicePrompt: "Explain the signal before retrying.", returnToActivityId: "assessment", successSignal: "A response is present." };
  if (type === "mastery_check" || type === "module_assessment" || type === "capstone_activity") return { ...base, type, prompt: "Explain the signal.", expectedAnswer: "signal", passScore: 1, explanation: "Use the authored signal.", rubric: { requiredConcepts: [{ id: "signal", label: "Signal", keywords: ["signal"] }] }, conceptIds: ["signal"] };
  return { ...base, type, prompt: "Name the signal.", expectedAnswer: "signal", responseRequired: true } as CourseActivity;
}

const activities: CourseActivity[] = [
  activity("intro", "instruction"),
  activity("guided", "guided_practice"),
  activity("independent", "scenario"),
  activity("repair", "remediation"),
  activity("assessment", "mastery_check"),
  activity("module-assessment", "module_assessment"),
  activity("capstone", "capstone_activity")
];

function formalSegment(id: string, type: LectureSegment["type"], activityId: string): LectureSegment {
  return { id, type, title: `Segment ${id}`, conceptIds: ["signal"], sourceActivityId: activityId, sourceLocation: location(activityId), estimatedMinutes: 2, required: true };
}

const lecture: LectureDefinition = {
  id: "lecture-bridge", version: "1.0.0", courseId: "course-bridge", moduleId: "unit-bridge", lessonIds: ["lesson-bridge"], title: "Bridge fixture lecture", abstract: "A neutral lecture fixture.", objectives: ["Trace authored evidence"], prerequisiteConceptIds: [], estimatedMinutes: 20, references: [], tags: ["fixture"], explicit: true,
  segments: [
    { id: "opening", type: "OPENING", title: "Opening", conceptIds: [], authoredContent: { kind: "prose", paragraphs: ["Begin with the authored explanation."] }, estimatedMinutes: 1, required: true },
    formalSegment("guided-segment", "GUIDED_PRACTICE", "guided"),
    formalSegment("independent-segment", "INDEPENDENT_PRACTICE", "independent"),
    formalSegment("assessment-segment", "ASSESSMENT", "assessment"),
    formalSegment("remediation-segment", "REMEDIATION", "repair"),
    formalSegment("module-assessment-segment", "ASSESSMENT", "module-assessment"),
    formalSegment("capstone-segment", "ASSESSMENT", "capstone"),
    { id: "question", type: "SOCRATIC_QUESTION", title: "Question", conceptIds: [], prompt: "What would you verify?", expectedInteraction: "question", estimatedMinutes: 1, required: true },
    { id: "closing", type: "CLOSING", title: "Closing", conceptIds: [], authoredContent: { kind: "prose", paragraphs: ["Close the lecture."] }, estimatedMinutes: 1, required: true }
  ]
};

const bridgePackage: CoursePackageDocument = {
  manifest: { format: "skillforge-course", formatVersion: 1, packageId: "fixture.lecture.bridge", packageVersion: "1.0.0", courseId: "course-bridge", courseVersion: "1.0.0", contentVersion: "bridge-1", title: "Lecture bridge fixture", description: "Neutral public-safe fixture", capabilities: ["lecture-delivery", "remediation"] },
  course: {
    id: "course-bridge", version: "1.0.0", contentVersion: "bridge-1", title: "Lecture bridge fixture", subtitle: "Neutral", description: "Neutral public-safe fixture", subject: "Systems", level: "foundational", audience: "Learners", prerequisites: [], outcomes: ["Trace evidence"], estimatedTotalMinutes: 30,
    modules: [{ id: "unit-bridge", title: "Bridge unit", summary: "Neutral unit", learningOutcomes: ["Trace evidence"], prerequisiteModuleIds: [], lessons: [{ id: "lesson-bridge", title: "Bridge lesson", summary: "Neutral lesson", objectives: ["Trace evidence"], estimatedMinutes: 20, prerequisiteKnowledge: [], prerequisiteLessonIds: [], conceptIds: ["signal"], activities, masteryRule: { gateActivityId: "module-assessment", passScore: 1, requiredActivityIds: ["intro", "guided", "independent", "assessment", "module-assessment"], retryPolicy: "remediate-then-retry" }, remediationActivityId: "repair", references: [], tags: ["fixture"] }], estimatedMinutes: 20, masteryRequirements: ["assessment"], moduleAssessment: { id: "module-assessment", title: "Module assessment", activityIds: ["module-assessment"], passScore: 1, description: "Neutral module assessment", conceptIds: ["signal"], rubric: { requiredConcepts: [{ id: "signal", label: "Signal", keywords: ["signal"] }] } } }],
    optionalResources: [], capstone: { id: "capstone", title: "Capstone", activityIds: ["capstone"], passScore: 1, description: "Neutral capstone", stages: [{ number: 1, title: "Stage 1", prompt: "Explain the signal.", rubric: { requiredConcepts: [{ id: "signal", label: "Signal", keywords: ["signal"] }] } }], finalIntegration: true }, finalAssessment: { id: "final", title: "Final", activityIds: ["assessment"], passScore: 1, description: "Neutral final", finalIntegration: true }, metadata: { tags: ["fixture"] }, visibility: "public", type: "course"
  },
  lectures: { courseId: "course-bridge", version: "1.0.0", explicitLectureIds: ["lecture-bridge"], lectures: [lecture] }
};

const context = createCourseRuntimeContext(bridgePackage);

function runAt(segmentId: string) {
  return { ...createLectureRunState(lecture, "2026-10-05T00:00:00.000Z"), currentSegmentId: segmentId };
}

function completeBefore(progress: ReturnType<typeof createCourseProgress>, ids: string[]) {
  return ids.reduce((next, id) => completeAuthoredActivity(context, next, location(id), { passed: true, masteryEvidence: "self-assessed" }), progress);
}

describe("lecture formal activity UI bridge", () => {
  it("resolves guided practice by the exact authored source tuple", () => {
    const resolved = resolveLectureActivity(context, lecture.segments[1]);
    expect(resolved?.activity.type).toBe("guided_practice");
    expect(resolved?.location).toEqual(location("guided"));
  });

  it("resolves independent practice by the exact authored source tuple", () => {
    expect(resolveLectureActivity(context, lecture.segments[2])?.activity.id).toBe("independent");
  });

  it("resolves assessment by the exact authored source tuple", () => {
    expect(resolveLectureActivity(context, lecture.segments[3])?.activity.type).toBe("mastery_check");
  });

  it("resolves remediation by the exact authored source tuple", () => {
    expect(resolveLectureActivity(context, lecture.segments[4])?.activity.type).toBe("remediation");
  });

  it("fails closed when sourceActivityId is missing", () => {
    const segment = { ...lecture.segments[1], sourceActivityId: undefined };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("fails closed when sourceLocation is missing", () => {
    const segment = { ...lecture.segments[1], sourceLocation: undefined };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("fails closed when sourceActivityId and sourceLocation disagree", () => {
    const segment = { ...lecture.segments[1], sourceActivityId: "independent" };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("fails closed when the source module is unknown", () => {
    const segment = { ...lecture.segments[1], sourceLocation: { ...location("guided"), moduleId: "missing" } };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("fails closed when the source lesson is unknown", () => {
    const segment = { ...lecture.segments[1], sourceLocation: { ...location("guided"), lessonId: "missing" } };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("fails closed when the source activity is unknown", () => {
    const segment = { ...lecture.segments[1], sourceActivityId: "missing", sourceLocation: location("missing") };
    expect(resolveLectureActivity(context, segment)).toBeUndefined();
  });

  it("uses activity presentation for guided practice", () => {
    expect(segmentPresentationKind(lecture.segments[1])).toBe("activity");
  });

  it("uses activity presentation for independent practice", () => {
    expect(segmentPresentationKind(lecture.segments[2])).toBe("activity");
  });

  it("uses activity presentation for assessment", () => {
    expect(segmentPresentationKind(lecture.segments[3])).toBe("activity");
  });

  it("uses activity presentation for remediation", () => {
    expect(segmentPresentationKind(lecture.segments[4])).toBe("activity");
  });

  it("does not treat guided practice as a mastery gate", () => {
    expect(isFormalActivity(resolveLectureActivity(context, lecture.segments[1])?.activity)).toBe(false);
    expect(isFormalActivity(resolveLectureActivity(context, lecture.segments[3])?.activity)).toBe(true);
  });

  it("does not allow direct advance to bypass guided practice", () => {
    const run = runAt("guided-segment");
    expect(advanceLectureSegment(lecture, run, createCourseProgress(context)).currentSegmentId).toBe("guided-segment");
  });

  it("does not allow direct advance to bypass assessment", () => {
    const run = runAt("assessment-segment");
    expect(advanceLectureSegment(lecture, run, createCourseProgress(context)).currentSegmentId).toBe("assessment-segment");
  });

  it("completes guided practice through CourseProgress and advances the lecture", () => {
    const applied = applyLectureActivityResponse(context, createCourseProgress(context), lecture, runAt("guided-segment"), lecture.segments[1], "I would verify the signal.");
    expect(applied?.outcome.passed).toBe(true);
    expect(applied?.progress.lessonProgress["lesson-bridge"].completedActivityIds).toContain("guided");
    expect(applied?.run.currentSegmentId).toBe("independent-segment");
  });

  it("completes independent practice with self-assessed evidence", () => {
    const applied = applyLectureActivityResponse(context, createCourseProgress(context), lecture, runAt("independent-segment"), lecture.segments[2], "I would verify the signal.");
    expect(applied?.outcome.masteryEvidence).toBe("self-assessed");
    expect(applied?.progress.lessonProgress["lesson-bridge"].masteryEvidence).toBe("none");
  });

  it("keeps a failed assessment out of completed activity state and routes to remediation", () => {
    const progress = completeBefore(createCourseProgress(context), ["intro", "guided", "independent"]);
    const applied = applyLectureActivityResponse(context, progress, lecture, runAt("assessment-segment"), lecture.segments[3], "not enough");
    expect(applied?.outcome.passed).toBe(false);
    expect(applied?.progress.lessonProgress["lesson-bridge"].completedActivityIds).not.toContain("assessment");
    expect(applied?.progress.current.activityId).toBe("repair");
    expect(applied?.run.currentSegmentId).toBe("remediation-segment");
  });

  it("passes an assessment only through its authored rubric", () => {
    const progress = completeBefore(createCourseProgress(context), ["intro", "guided", "independent"]);
    const applied = applyLectureActivityResponse(context, progress, lecture, runAt("assessment-segment"), lecture.segments[3], "The signal is verified.");
    expect(applied?.outcome.assessment?.provenance).toBe("semantic");
    expect(applied?.progress.lessonProgress["lesson-bridge"].completedActivityIds).toContain("assessment");
  });

  it("uses completeRemediation retry semantics for remediation", () => {
    const failed = applyLectureActivityResponse(context, completeBefore(createCourseProgress(context), ["intro", "guided", "independent"]), lecture, runAt("assessment-segment"), lecture.segments[3], "not enough");
    const retried = failed && applyLectureActivityResponse(context, failed.progress, lecture, failed.run, lecture.segments[4], "I can now explain the signal.");
    expect(retried?.progress.current.activityId).toBe("assessment");
    expect(retried?.run.currentSegmentId).toBe("assessment-segment");
  });

  it("preserves module assessment authority", () => {
    const progress = completeBefore(createCourseProgress(context), ["intro", "guided", "independent", "assessment"]);
    const applied = applyLectureActivityResponse(context, progress, lecture, runAt("module-assessment-segment"), lecture.segments[5], "The signal is verified.");
    expect(applied?.progress.moduleProgress["unit-bridge"].assessmentPassed).toBe(true);
    expect(applied?.progress.moduleProgress["unit-bridge"].assessmentEvidence).toBe("self-assessed");
  });

  it("preserves capstone stage semantics", () => {
    const progress = completeBefore(createCourseProgress(context), ["intro", "guided", "independent", "assessment", "module-assessment"]);
    progress.capstone!.currentStage = 2;
    const applied = applyLectureActivityResponse(context, progress, lecture, runAt("capstone-segment"), lecture.segments[6], "The signal is verified.");
    expect(applied?.progress.capstone?.completedStageNumbers).toEqual([2]);
    expect(applied?.progress.capstone?.finalIntegrationPassed).toBe(true);
  });

  it("does not mutate progress when the formal source cannot be resolved", () => {
    const progress = createCourseProgress(context);
    const broken = { ...lecture.segments[1], sourceActivityId: "missing", sourceLocation: location("missing") };
    const before = structuredClone(progress);
    expect(applyLectureActivityResponse(context, progress, lecture, runAt("guided-segment"), broken, "signal")).toBeUndefined();
    expect(progress).toEqual(before);
    expect(LECTURE_ACTIVITY_RESOLUTION_ERROR).toBe("This lecture activity could not be resolved.");
  });

  it("retains informational lecture advancement", () => {
    const run = runAt("opening");
    expect(advanceLectureSegment(lecture, run, createCourseProgress(context)).currentSegmentId).toBe("guided-segment");
  });

  it("retains interactive lecture response and advancement", () => {
    const run = runAt("question");
    const next = advanceLectureSegment(lecture, run, createCourseProgress(context), { text: "Verify the signal.", kind: "question" });
    expect(next.responses[0]).toMatchObject({ segmentId: "question", text: "Verify the signal.", kind: "question" });
    expect(next.currentSegmentId).toBe("closing");
  });

  it("reports incomplete lecture completion state", () => {
    expect(lectureCompletionLabel(lecture, { ...runAt("guided-segment"), visitedSegmentIds: ["opening"] }, createCourseProgress(context))).toBe("1 of 9 required segments complete");
  });

  it("reports complete lecture state from visited segments and CourseProgress", () => {
    const progress = completeBefore(createCourseProgress(context), ["intro", "guided", "independent", "assessment", "repair", "module-assessment", "capstone"]);
    const run = { ...runAt("closing"), visitedSegmentIds: lecture.segments.map(segment => segment.id) };
    expect(lectureCompletionLabel(lecture, run, progress)).toBe("Lecture complete");
  });

  it("continues to use the shared authored response runtime", () => {
    const progress = createCourseProgress(context);
    const next = applyAuthoredActivityResponse(context, progress, location("guided"), "The signal is verified.");
    expect(next.lessonProgress["lesson-bridge"].completedActivityIds).toContain("guided");
  });
});
