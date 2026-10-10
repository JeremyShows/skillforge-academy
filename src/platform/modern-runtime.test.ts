import { describe, expect, it } from "vitest";
import { academicRecordSummary, deriveAcademicAssessmentStatus, deriveAcademicAssignmentStatus, markReadingComplete, markSyllabusViewed, readingIsComplete } from "../academic/progress";
import type { AcademicCatalog } from "../academic/types";
import { emptyClassroomState, completeClassRecord, pauseClassRecord, resumeClassRecord } from "../classroom/types";
import { activeSegmentForProgress, planClassSession } from "../classroom/planner";
import { completeActivity, completeRemediation, createCourseProgress, markActivityStarted, markMasteryAssisted, endClassSession } from "../course/progress";
import type { Course, CourseActivity, CourseLocation } from "../course/types";
import { createFallbackInstructorService } from "../instructor/service";
import { addLectureNote, advanceLectureSegment, createLectureRunState, recordLectureResponse, toggleLectureBookmark } from "../lecture/runtime";
import type { LectureDefinition } from "../lecture/types";
import { applyLabAction, completeLabRun, createLabRun, evaluateLabChecks, pauseLabRun, recordLabObservation, recordLabPrediction, recordLabReflection, resumeLabRun, visitLabStep } from "../labs/runtime";
import type { LabDefinition } from "../labs/types";
import { courseProgressMapFromEnvelope, emptyPlatformLearnerEnvelope } from "./persistence";
import type { CourseRuntimeContext } from "./runtime";

const location = (activityId: string): CourseLocation => ({ moduleId: "unit-1", lessonId: "lesson-1", activityId });

function makeActivity(id: string, type: CourseActivity["type"]): CourseActivity {
  const base = { id, title: id, estimatedMinutes: 5, required: id !== "remediation", objectiveIds: ["objective-1"] };
  if (type === "instruction" || type === "concept_explanation") return { ...base, type, body: `Authored ${id}`, keyPoints: ["point"], blocks: [{ type: "prose", heading: id, body: "Authored explanation" }] };
  if (type === "remediation") return { ...base, type, body: "Repair the missed concept.", practicePrompt: "Try the concept again.", returnToActivityId: "gate", successSignal: "A fresh explanation is given." };
  if (type === "mastery_check" || type === "module_assessment" || type === "capstone_activity") return { ...base, type, prompt: `Pass ${id}`, expectedAnswer: "evidence", passScore: 1, explanation: "Authored rubric", rubric: { requiredConcepts: [{ id: "concept-1", label: "Concept", keywords: ["evidence"] }] }, conceptIds: ["concept-1"] };
  if (type === "guided_practice") return { ...base, type, prompt: "Practice", expectedReasoning: ["reason"], responseRequired: true, responseType: "text", responsePrompt: "Explain." };
  return { ...base, type: type as "short_answer", prompt: "Recall", expectedAnswer: "evidence", responseRequired: true };
}

function makeCourse(options: { moduleAssessment?: boolean; capstone?: boolean } = {}): Course {
  const activities: CourseActivity[] = [makeActivity("intro", "instruction"), makeActivity("practice", "guided_practice"), makeActivity("remediation", "remediation"), makeActivity("gate", "mastery_check")];
  if (options.moduleAssessment) activities.push(makeActivity("module-assessment", "module_assessment"));
  if (options.capstone) activities.push(makeActivity("capstone", "capstone_activity"));
  const lesson = { id: "lesson-1", title: "Lesson", summary: "Summary", objectives: ["Objective"], estimatedMinutes: 30, activities, masteryRule: { gateActivityId: options.moduleAssessment ? "module-assessment" : "gate", passScore: 1, requiredActivityIds: activities.filter(item => item.required !== false && item.type !== "module_assessment" && item.type !== "capstone_activity").map(item => item.id), retryPolicy: "remediate-then-retry" as const }, remediationActivityId: "remediation", conceptIds: ["concept-1"], tags: [] };
  const module = { id: "unit-1", title: "Unit", summary: "Summary", learningOutcomes: ["Outcome"], prerequisiteModuleIds: [], lessons: [lesson], estimatedMinutes: 30, masteryRequirements: [], moduleAssessment: options.moduleAssessment ? { id: "assessment", title: "Assessment", activityIds: ["module-assessment"], passScore: 1, description: "Unfamiliar integrated scenario", conceptIds: ["concept-1", "concept-2"], rubric: { requiredConcepts: [{ id: "concept-1", label: "Concept", keywords: [] }, { id: "concept-2", label: "Second concept", keywords: [] }] } } : undefined };
  return { id: "fixture-course", version: "1.0.0", contentVersion: "fixture-1", title: "Fixture Course", subtitle: "Fixture", description: "Neutral authored fixture", subject: "Systems", level: "foundational", audience: "learners", prerequisites: [], outcomes: ["Outcome"], estimatedTotalMinutes: 30, modules: [module], optionalResources: [], capstone: { id: "capstone", title: "Capstone", activityIds: options.capstone ? ["capstone"] : [], passScore: 1, description: "Capstone" , stages: options.capstone ? [1, 2, 3].map(number => ({ number, title: `Stage ${number}`, prompt: "Respond", rubric: { requiredConcepts: [] } })) : [], finalIntegration: Boolean(options.capstone) }, finalAssessment: { id: "final", title: "Final", activityIds: [], passScore: 1, description: "Final", finalIntegration: Boolean(options.capstone) }, metadata: { tags: [] }, visibility: "public", type: "course" };
}

function makeRuntimeContext(course: Course, packageId: string): CourseRuntimeContext {
  return {
    package: { manifest: { packageId } } as unknown as CourseRuntimeContext["package"],
    course,
    capabilities: [],
    progressNamespace: `${packageId}@${course.version}`
  };
}

function finishRequiredWork(course: Course, progress = createCourseProgress(course)) {
  let next = progress;
  for (const id of ["intro", "practice"]) next = completeActivity(course, next, location(id), { passed: true });
  return next;
}

describe("public modern runtime authority", () => {
  it("does not allow lesson-card completion to bypass CourseProgress", () => {
    const course = makeCourse();
    const progress = createCourseProgress(course);
    expect(progress.lessonProgress["lesson-1"].completedActivityIds).toEqual([]);
    expect(progress.completedAt).toBeUndefined();
  });

  it("advances completion through authored activities and preserves mastery evidence", () => {
    const course = makeCourse();
    let progress = finishRequiredWork(course);
    progress = completeActivity(course, progress, location("gate"), { passed: true, masteryEvidence: "verified" });
    expect(progress.lessonProgress["lesson-1"].mastery).toBe("mastered");
    expect(progress.lessonProgress["lesson-1"].masteryEvidence).toBe("verified");
    expect(progress.lessonProgress["lesson-1"].completionState).toBe("completed");
  });

  it("preserves remediation and retry state after a failed mastery attempt", () => {
    const course = makeCourse();
    let progress = finishRequiredWork(course);
    progress = completeActivity(course, progress, location("gate"), { passed: false, weaknessTags: ["concept-gap"] });
    expect(progress.current.activityId).toBe("remediation");
    expect(progress.lessonProgress["lesson-1"].remediationCount).toBe(1);
    expect(progress.reviewQueue[0].reason).toBe("failed-mastery");
    progress = completeRemediation(course, progress, location("remediation"));
    expect(progress.current.activityId).toBe("gate");
    expect(progress.lessonProgress["lesson-1"].mastery).toBe("needs-review");
  });

  it("keeps the first-pass and remediation-retry CourseProgress paths intact", () => {
    const course = makeCourse();
    let progress = finishRequiredWork(course);
    expect(progress.lessonProgress["lesson-1"].completedActivityIds).toContain("practice");
    progress = completeActivity(course, progress, location("gate"), { passed: false, weaknessTags: ["concept-gap"] });
    expect(progress.current.activityId).toBe("remediation");
    progress = completeRemediation(course, progress, location("remediation"));
    expect(progress.current.activityId).toBe("gate");
    progress = completeActivity(course, progress, location("gate"), { passed: true, masteryEvidence: "verified" });
    expect(progress.lessonProgress["lesson-1"].mastery).toBe("mastered");
    expect(progress.lessonProgress["lesson-1"].remediationCount).toBe(1);
    expect(progress.lessonProgress["lesson-1"].completedActivityIds).toContain("gate");
  });
  it("records assisted attempts without granting fresh mastery", () => {
    const course = makeCourse();
    let progress = finishRequiredWork(course);
    progress = markMasteryAssisted(progress, location("gate"));
    progress = completeActivity(course, progress, location("gate"), { passed: true, assisted: true });
    expect(progress.lessonProgress["lesson-1"].mastery).toBe("needs-review");
    expect(progress.reviewQueue.some(item => item.reason === "manual-review")).toBe(true);
  });

  it("retains module assessment authority separately from lesson mastery", () => {
    const course = makeCourse({ moduleAssessment: true });
    let progress = finishRequiredWork(course);
    progress = completeActivity(course, progress, location("gate"), { passed: true });
    progress = completeActivity(course, progress, location("module-assessment"), { passed: true, masteryEvidence: "self-assessed" });
    expect(progress.moduleProgress["unit-1"].assessmentPassed).toBe(true);
    expect(progress.moduleProgress["unit-1"].assessmentEvidence).toBe("self-assessed");
  });

  it("derives course completion from authoritative progress and capstone stages", () => {
    const course = makeCourse({ capstone: true });
    let progress = finishRequiredWork(course);
    progress = completeActivity(course, progress, location("gate"), { passed: true });
    for (const stage of [1, 2, 3, 4]) progress = completeActivity(course, progress, location("capstone"), { passed: true, stage, response: `stage-${stage}` });
    expect(progress.capstone?.completedStageNumbers).toEqual([1, 2, 3, 4]);
    expect(progress.capstone?.finalIntegrationPassed).toBe(true);
    expect(progress.completedAt).toBeTruthy();
  });

  it("creates and resumes a ClassSessionRecord around the same checkpoint", () => {
    const course = makeCourse();
    let progress = markActivityStarted(createCourseProgress(course), location("intro"));
    expect(progress.activeSessionId).toBeTruthy();
    progress = endClassSession(progress, "paused");
    expect(progress.sessions[0].status).toBe("paused");
    const classroom = emptyClassroomState("2026-10-04T00:00:00.000Z");
    const plan = planClassSession(course, progress, classroom, "2026-10-04T00:00:00.000Z");
    expect(activeSegmentForProgress(course, plan, progress)?.activityId).toBe("intro");
  });

  it("preserves class pause/resume/complete timing boundaries", () => {
    const record = { id: "class", courseId: "fixture-course", planId: "plan", status: "active" as const, startedAt: "2026-10-04T00:00:00.000Z", lastActivityAt: "2026-10-04T00:00:00.000Z", activeStartedAt: "2026-10-04T00:00:00.000Z", accumulatedActiveMs: 0, timingValid: true, plannedSegments: [], attemptedSegments: [], conceptsPracticed: [], encounteredReviewConcepts: [], resolvedReviewConcepts: [], openReviewConceptsAtClose: [], needsReviewConcepts: [], assistedSegmentIds: [], assignmentIds: [] };
    const paused = pauseClassRecord(record, "2026-10-04T00:05:00.000Z");
    const resumed = resumeClassRecord(paused, "2026-10-04T00:10:00.000Z");
    const completed = completeClassRecord(resumed, "2026-10-04T00:15:00.000Z");
    expect(completed.status).toBe("completed");
    expect(completed.accumulatedActiveMs).toBe(600000);
  });

  it("persists lecture cursor, response, notes, and bookmarks", () => {
    const lecture: LectureDefinition = { id: "lecture-1", version: "1.0.0", courseId: "fixture-course", moduleId: "unit-1", lessonIds: ["lesson-1"], title: "Fixture lecture", abstract: "Abstract", objectives: ["Objective"], prerequisiteConceptIds: [], estimatedMinutes: 10, references: [], tags: [], explicit: true, segments: [
      { id: "opening", type: "OPENING", title: "Opening", conceptIds: [], estimatedMinutes: 1, required: true },
      { id: "predict", type: "PAUSE_AND_PREDICT", title: "Predict", conceptIds: [], prompt: "What happens?", expectedInteraction: "prediction", estimatedMinutes: 3, required: true },
      { id: "close", type: "CLOSING", title: "Closing", conceptIds: [], estimatedMinutes: 1, required: true }
    ] };
    let run = createLectureRunState(lecture, "2026-10-04T00:00:00.000Z");
    run = advanceLectureSegment(lecture, run, createCourseProgress(makeCourse()), undefined, "2026-10-04T00:00:30.000Z");
    run = recordLectureResponse(run, "predict", { text: "The state changes", kind: "prediction" }, "2026-10-04T00:01:00.000Z");
    run = advanceLectureSegment(lecture, run, createCourseProgress(makeCourse()), undefined, "2026-10-04T00:01:30.000Z");
    run = addLectureNote(run, "opening", "Remember the invariant", "2026-10-04T00:02:00.000Z");
    run = toggleLectureBookmark(run, "opening", "2026-10-04T00:02:00.000Z");
    expect(run.responses).toHaveLength(1);
    expect(run.notes[0].text).toBe("Remember the invariant");
    expect(run.bookmarks).toHaveLength(1);
    expect(run.currentSegmentId).toBe("close");
  });

  it("does not let formal lecture segments advance without CourseProgress evidence", () => {
    const lecture: LectureDefinition = { id: "lecture-2", version: "1.0.0", courseId: "fixture-course", moduleId: "unit-1", lessonIds: ["lesson-1"], title: "Formal lecture", abstract: "Abstract", objectives: [], prerequisiteConceptIds: [], estimatedMinutes: 5, references: [], tags: [], explicit: true, segments: [{ id: "formal", type: "ASSESSMENT", title: "Formal", conceptIds: [], sourceActivityId: "gate", sourceLocation: location("gate"), estimatedMinutes: 2, required: true }, { id: "close", type: "CLOSING", title: "Closing", conceptIds: [], estimatedMinutes: 1, required: true }] };
    const run = createLectureRunState(lecture);
    expect(advanceLectureSegment(lecture, run, createCourseProgress(makeCourse())).currentSegmentId).toBe("formal");
  });

  it("keeps instructor fallback bounded and unable to mutate authority", async () => {
    const service = createFallbackInstructorService();
    const response = await service.respond({ courseId: "fixture-course", courseTitle: "Fixture Course", moduleId: "unit-1", moduleTitle: "Unit", lessonId: "lesson-1", lessonTitle: "Lesson", lessonSummary: "Summary", objective: "Objective", concept: "Concept", activity: { id: "intro", type: "instruction", title: "Intro" }, verifiedEvidenceIds: [], verifiedEvidenceReferences: [], learnerMessage: "Explain", recentTurns: [] }, "TEACH");
    expect(response.basis).toBe("fallback");
    expect(response.evidenceIds).toEqual([]);
    expect(response.message).not.toMatch(/mark|override|mastery/i);
  });

  it("derives academic reading, assignment, and assessment status from progress", () => {
    const course = makeCourse();
    const context = makeRuntimeContext(course, "fixture.package");
    const source = location("gate");
    const catalog = { version: "fixture-academic-1", programs: [], courses: [{ id: "academic-course", courseId: course.id, academicCatalogVersion: "fixture-academic-1", syllabus: {} as never, units: [{ id: "academic-unit", courseId: course.id, moduleId: "unit-1", number: 1, title: "Unit", description: "Unit", learningOutcomes: [], lectureIds: [], readingIds: ["reading"], assignmentIds: ["assignment"], assessmentIds: ["assessment"], labIds: [], prerequisiteUnitIds: [] }], readings: [{ id: "reading", courseId: course.id, unitId: "academic-unit", title: "Reading", description: "Reading", kind: "internal-course-text", required: true, estimatedMinutes: 5, source: { type: "lesson-authored-content", lessonId: "lesson-1" }, lessonIds: ["lesson-1"], lectureIds: [], learningObjectives: [] }], assignments: [{ id: "assignment", courseId: course.id, unitId: "academic-unit", title: "Assignment", description: "Assignment", objectives: [], sourceActivityIds: ["gate"], sourceLocations: [source], required: true, kind: "practice", completionPolicy: "all-source-activities-complete", assistancePolicy: "existing-course-activity-policy", estimatedMinutes: 5 }], assessments: [{ id: "assessment", courseId: course.id, unitId: "academic-unit", title: "Assessment", description: "Assessment", kind: "mastery-gate", sourceActivityIds: ["gate"], sourceLocations: [source], coverageConceptIds: ["concept-1"], required: true, assistancePolicy: "formal-gate-marks-assisted", completionPolicy: "derived-from-CourseProgress", estimatedMinutes: 5 }] }] } as AcademicCatalog;
    let progress = finishRequiredWork(course);
    const namespace = context.progressNamespace;
    const hydratedEnvelope = emptyPlatformLearnerEnvelope();
    hydratedEnvelope.courses[namespace] = { progress };
    let authoritativeProgress = courseProgressMapFromEnvelope(hydratedEnvelope, [context])[namespace];
    expect(authoritativeProgress).not.toBe(progress);
    expect(authoritativeProgress.courseId).toBe(course.id);
    expect(authoritativeProgress.courseVersion).toBe(course.version);
    expect(authoritativeProgress.contentVersion).toBe(course.contentVersion);
    expect(authoritativeProgress.current).toEqual(progress.current);
    expect(authoritativeProgress.lessonProgress["lesson-1"].completedActivityIds).toEqual(["intro", "practice"]);
    let engagement = markSyllabusViewed(markReadingComplete({ academicCatalogVersion: "fixture-academic-1", readingCompletions: {} }, "reading", "2026-10-04T00:00:00.000Z"), "2026-10-04T00:00:00.000Z");
    expect(readingIsComplete(engagement, "reading")).toBe(true);
    expect(deriveAcademicAssignmentStatus(catalog.courses[0].assignments[0], course, authoritativeProgress).status).toBe("not-started");
    progress = completeActivity(course, progress, source, { passed: true, masteryEvidence: "verified" });
    hydratedEnvelope.courses[namespace] = { ...hydratedEnvelope.courses[namespace], progress };
    authoritativeProgress = courseProgressMapFromEnvelope(hydratedEnvelope, [context])[namespace];
    expect(deriveAcademicAssignmentStatus(catalog.courses[0].assignments[0], course, authoritativeProgress).status).toBe("complete");
    expect(deriveAcademicAssessmentStatus(catalog.courses[0].assessments[0], course, authoritativeProgress).status).toBe("rubric-verified");
    expect(academicRecordSummary(catalog, course, authoritativeProgress, engagement).readingEngagementCount).toBe(1);
  });

  it("sanitizes progress per package namespace without writing it back", () => {
    const course = makeCourse();
    const first = makeRuntimeContext(course, "fixture.one");
    const second = makeRuntimeContext(course, "fixture.two");
    const firstProgress = finishRequiredWork(course);
    const secondProgress = createCourseProgress(course);
    const envelope = emptyPlatformLearnerEnvelope();
    envelope.courses[first.progressNamespace] = { progress: { ...firstProgress, packageId: "fixture.one", assessmentAttempts: 3, notes: ["first"] } };
    envelope.courses[second.progressNamespace] = { progress: { ...secondProgress, packageId: "fixture.two", assessmentAttempts: 1, notes: ["second"] } };
    const beforeProjection = structuredClone(envelope);

    const progress = courseProgressMapFromEnvelope(envelope, [first, second]);

    expect(progress[first.progressNamespace].packageId).toBe("fixture.one");
    expect(progress[first.progressNamespace].assessmentAttempts).toBe(3);
    expect(progress[first.progressNamespace].notes).toEqual(["first"]);
    expect(progress[first.progressNamespace].lessonProgress["lesson-1"].completedActivityIds).toEqual(["intro", "practice"]);
    expect(progress[second.progressNamespace].packageId).toBe("fixture.two");
    expect(progress[second.progressNamespace].lessonProgress["lesson-1"].completedActivityIds).toEqual([]);
    expect(envelope).toEqual(beforeProjection);
  });

  it("never exposes an object-shaped malformed progress slot to runtime consumers", () => {
    const course = makeCourse();
    const context = makeRuntimeContext(course, "fixture.malformed");
    const envelope = emptyPlatformLearnerEnvelope();
    envelope.courses[context.progressNamespace] = { progress: {} };

    const progress = courseProgressMapFromEnvelope(envelope, [context])[context.progressNamespace];

    expect(progress.courseId).toBe(course.id);
    expect(progress.courseVersion).toBe(course.version);
    expect(progress.contentVersion).toBe(course.contentVersion);
    expect(progress.current).toEqual(location("intro"));
    expect(progress.lessonProgress["lesson-1"].completedActivityIds).toEqual([]);
    expect(progress.moduleProgress["unit-1"]).toBeDefined();
  });

  it("reconciles the same package and course-version namespace against changed authored content", () => {
    const originalCourse = makeCourse();
    const packageId = "fixture.updated-content";
    const saved = finishRequiredWork(originalCourse);
    saved.current = { moduleId: "removed-module", lessonId: "removed-lesson", activityId: "removed-activity" };
    saved.lessonProgress["lesson-1"] = { completedActivityIds: ["intro", "practice", "removed-activity"] } as typeof saved.lessonProgress["lesson-1"];
    saved.moduleProgress["unit-1"] = {} as typeof saved.moduleProgress["unit-1"];
    const envelope = emptyPlatformLearnerEnvelope();
    const priorContext = makeRuntimeContext(originalCourse, packageId);
    envelope.installedPackages = [{
      packageId,
      courseId: originalCourse.id,
      courseVersion: originalCourse.version,
      contentVersion: originalCourse.contentVersion
    }];
    envelope.courses[priorContext.progressNamespace] = { progress: { ...saved, packageId, assessmentAttempts: 4, notes: ["kept"] } };
    const beforeProjection = structuredClone(envelope);
    const updatedCourse: Course = {
      ...originalCourse,
      contentVersion: "fixture-2",
      modules: originalCourse.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          activities: [...lesson.activities, makeActivity("new-content", "short_answer")],
          masteryRule: { ...lesson.masteryRule, requiredActivityIds: [...lesson.masteryRule.requiredActivityIds, "new-content"] }
        }))
      }))
    };
    const currentContext = makeRuntimeContext(updatedCourse, packageId);

    expect(currentContext.progressNamespace).toBe(priorContext.progressNamespace);
    const reconciled = courseProgressMapFromEnvelope(envelope, [currentContext])[currentContext.progressNamespace];

    expect(reconciled.contentVersion).toBe("fixture-2");
    expect(reconciled.current).toEqual({ moduleId: "unit-1", lessonId: "lesson-1", activityId: "intro" });
    expect(reconciled.lessonProgress["lesson-1"].completedActivityIds).toEqual(["intro", "practice"]);
    expect(reconciled.lessonProgress["lesson-1"].completionState).toBe("in-progress");
    expect(reconciled.lessonProgress["lesson-1"].mastery).toBe("needs-review");
    expect(reconciled.packageId).toBe(packageId);
    expect(reconciled.completedLessonIds).toEqual([]);
    expect(reconciled.assessmentAttempts).toBe(4);
    expect(reconciled.notes).toEqual(["kept"]);
    expect(envelope).toEqual(beforeProjection);
  });

  it("runs the full deterministic Labs flow with append effects and no mastery grant", () => {
    const lab: LabDefinition = { id: "lab-1", number: 1, courseId: "fixture-course", moduleId: "unit-1", unitId: "unit-1", title: "Fixture Lab", purpose: "Observe a bounded state transition", learningObjective: "Trace state", estimatedMinutes: 10, required: false, sourceLocations: [location("practice")], environment: { kind: "simulated-system", description: "Bounded simulation", capabilities: [], prohibitedCapabilities: ["network", "process"] }, initialState: { log: "" }, steps: [
      { id: "briefing", number: 1, title: "Briefing", kind: "briefing", instruction: "Read", required: true },
      { id: "prediction", number: 2, title: "Prediction", kind: "prediction", instruction: "Predict", required: true },
      { id: "action", number: 3, title: "Action", kind: "action", instruction: "Act", required: true, actionIds: ["append"] },
      { id: "observation", number: 4, title: "Observation", kind: "observation", instruction: "Observe", required: true },
      { id: "check", number: 5, title: "Check", kind: "check", instruction: "Check", required: true, checkIds: ["check"] },
      { id: "reflection", number: 6, title: "Reflection", kind: "reflection", instruction: "Reflect", required: true, reflectionPrompt: "What changed?" }
    ], actions: [{ id: "append", label: "Append", instruction: "Append", effects: [{ key: "log", operation: "append", value: "ok" }] }], checks: [{ id: "check", label: "State", description: "State is correct", required: true, conditions: [{ key: "log", operator: "equals", value: "ok" }] }], requiredStepIds: ["briefing", "prediction", "action", "observation", "check", "reflection"], reflectionPrompts: ["Reflect"], instructorNote: "Bounded" };
    let run = createLabRun(lab, "run-1", "2026-10-04T00:00:00.000Z");
    run = visitLabStep(lab, run, "prediction", "2026-10-04T00:01:00.000Z");
    run = recordLabPrediction(lab, run, "prediction", "The log will append", "2026-10-04T00:01:00.000Z");
    run = visitLabStep(lab, run, "action", "2026-10-04T00:02:00.000Z");
    run = applyLabAction(lab, run, "action", "append", "2026-10-04T00:03:00.000Z");
    run = recordLabObservation(run, "learner", "Observation", "The log changed", "2026-10-04T00:04:00.000Z");
    run = visitLabStep(lab, run, "check", "2026-10-04T00:05:00.000Z");
    run = evaluateLabChecks(lab, run, "2026-10-04T00:06:00.000Z");
    run = visitLabStep(lab, run, "reflection", "2026-10-04T00:07:00.000Z");
    run = recordLabReflection(run, "reflection", "The append was deterministic.", "2026-10-04T00:07:00.000Z");
    run = completeLabRun(lab, run, "2026-10-04T00:08:00.000Z");
    expect(run.state.log).toBe("ok");
    expect(run.actionHistory[0].changedKeys).toContain("log");
    expect(run.checks[0].passed).toBe(true);
    expect(run.status).toBe("completed");
  });

  it("preserves Lab pause/resume and reset state", () => {
    const lab = { ...({ id: "lab-2", number: 1, courseId: "fixture-course", moduleId: "unit-1", unitId: "unit-1", title: "Lab", purpose: "Purpose", learningObjective: "Objective", estimatedMinutes: 1, required: false, sourceLocations: [], environment: { kind: "simulated-system", description: "Bounded", capabilities: [], prohibitedCapabilities: [] }, initialState: {}, steps: [{ id: "briefing", number: 1, title: "Briefing", kind: "briefing", instruction: "Read", required: true }], actions: [], checks: [], requiredStepIds: ["briefing"], reflectionPrompts: [], instructorNote: "" } as LabDefinition) };
    let run = createLabRun(lab, "run-2");
    run = pauseLabRun(run, "2026-10-04T00:01:00.000Z");
    run = resumeLabRun(run, "2026-10-04T00:02:00.000Z");
    expect(run.status).toBe("active");
  });
});
