import { resolveResumePoint } from "../course/progress";
import type { Course, CourseLocation, CourseProgress } from "../course/types";
import type {
  AcademicAssessmentDefinition, AcademicAssessmentStatus, AcademicAssignmentDefinition, AcademicAssignmentStatus,
  AcademicCatalog, AcademicEngagementState, AcademicItemStatus, AcademicRecordSummary, AcademicUnitAvailability,
  AcademicUnitDefinition, AcademicUnitStatus, AcademicUnitStatusView
} from "./types";

function courseLocationKey(location: CourseLocation): string {
  return `${location.moduleId}/${location.lessonId}/${location.activityId}`;
}

function sourceActivitiesComplete(definition: { sourceLocations: CourseLocation[] }, progress: CourseProgress): string[] {
  return definition.sourceLocations.filter(location => progress.lessonProgress[location.lessonId]?.completedActivityIds.includes(location.activityId)).map(location => location.activityId);
}

export function markSyllabusViewed(state: AcademicEngagementState, completedAt = new Date().toISOString()): AcademicEngagementState { return { ...state, syllabusViewedAt: completedAt }; }
export function markReadingComplete(state: AcademicEngagementState, readingId: string, completedAt = new Date().toISOString()): AcademicEngagementState { return { ...state, readingCompletions: { ...state.readingCompletions, [readingId]: completedAt } }; }
export function readingIsComplete(state: AcademicEngagementState, readingId: string): boolean { return Boolean(state.readingCompletions[readingId]); }

function locationHasReview(progress: CourseProgress, location: CourseLocation): boolean { return progress.reviewQueue.some(item => item.lessonId === location.lessonId && item.activityId === location.activityId); }

function expectedCapstoneStageNumbers(course: Course): number[] {
  const authoredStages = (course.capstone.stages ?? []).map(stage => stage.number);
  return [...authoredStages, authoredStages.length + 1];
}

type CapstoneEvidenceState = "none" | "in-progress" | "complete" | "self-assessed" | "verified";

function capstoneEvidenceState(course: Course, progress: CourseProgress): CapstoneEvidenceState {
  const capstone = progress.capstone;
  if (!capstone || capstone.completedStageNumbers.length === 0) return "none";
  const expected = expectedCapstoneStageNumbers(course);
  const completed = new Set(capstone.completedStageNumbers);
  const allStagesCompleted = expected.every(stage => completed.has(stage));
  if (!capstone.finalIntegrationPassed || !allStagesCompleted) return "in-progress";
  const records = expected.map(stage => capstone.assessments[String(stage)]);
  const completeEvidence = records.length === expected.length && records.every(record => Boolean(record));
  if (!completeEvidence) return "complete";
  if (records.every(record => record?.masteryEvidence === "verified")) return "verified";
  if (records.every(record => record?.masteryEvidence === "self-assessed" || record?.masteryEvidence === "verified")) return "self-assessed";
  return "complete";
}

export function deriveAcademicAssignmentStatus(definition: AcademicAssignmentDefinition, _course: Course, progress: CourseProgress): AcademicAssignmentStatus {
  const completedSourceActivityIds = sourceActivitiesComplete(definition, progress);
  const allComplete = completedSourceActivityIds.length === definition.sourceLocations.length && definition.sourceLocations.length > 0;
  const needsReview = definition.sourceLocations.some(location => locationHasReview(progress, location));
  const status: AcademicItemStatus = allComplete ? needsReview ? "needs-review" : "complete" : completedSourceActivityIds.length ? "in-progress" : "not-started";
  return { definition, status, completedSourceActivityIds };
}

function statusForEvidence(evidence: "none" | "self-assessed" | "verified"): { status: AcademicItemStatus; evidence: AcademicAssessmentStatus["evidence"] } {
  return evidence === "verified" ? { status: "rubric-verified", evidence: "verified" } : evidence === "self-assessed" ? { status: "self-assessed", evidence: "self-assessed" } : { status: "complete", evidence: "none" };
}

function deriveQuizStatus(definition: AcademicAssessmentDefinition, progress: CourseProgress): AcademicAssessmentStatus {
  const completed = sourceActivitiesComplete(definition, progress);
  const review = definition.sourceLocations.some(location => locationHasReview(progress, location));
  const status: AcademicItemStatus = review ? "needs-review" : completed.length === definition.sourceLocations.length && completed.length > 0 ? "complete" : completed.length ? "in-progress" : "not-started";
  return { definition, status, evidence: "none" };
}

function deriveMasteryGateStatus(definition: AcademicAssessmentDefinition, course: Course, progress: CourseProgress): AcademicAssessmentStatus {
  const location = definition.sourceLocations[0];
  const lesson = location ? course.modules.find(module => module.id === location.moduleId)?.lessons.find(item => item.id === location.lessonId) : undefined;
  const lessonProgress = location ? progress.lessonProgress[location.lessonId] : undefined;
  if (!location || !lesson || !lessonProgress || lesson.masteryRule.gateActivityId !== location.activityId) return { definition, status: "not-started", evidence: "none" };
  if (locationHasReview(progress, location) || lessonProgress.masteryState === "needs-review") return { definition, status: "needs-review", evidence: "none" };
  if (!lessonProgress.completedActivityIds.includes(location.activityId)) return { definition, status: "not-started", evidence: "none" };
  return { definition, ...statusForEvidence(lessonProgress.masteryEvidence) };
}

function deriveUnitAssessmentStatus(definition: AcademicAssessmentDefinition, course: Course, progress: CourseProgress): AcademicAssessmentStatus {
  const location = definition.sourceLocations[0];
  const module = location ? course.modules.find(item => item.id === location.moduleId) : undefined;
  const moduleProgress = module ? progress.moduleProgress[module.id] : undefined;
  if (!location || !module || !moduleProgress || module.moduleAssessment?.activityIds.includes(location.activityId) !== true) return { definition, status: "not-started", evidence: "none" };
  const sourceCompleted = progress.lessonProgress[location.lessonId]?.completedActivityIds.includes(location.activityId) ?? false;
  if (locationHasReview(progress, location) || moduleProgress.assessmentPassed === false && sourceCompleted) return { definition, status: "needs-review", evidence: "none" };
  if (!moduleProgress.assessmentPassed) return { definition, status: "not-started", evidence: "none" };
  return { definition, ...statusForEvidence(moduleProgress.assessmentEvidence ?? "none") };
}

function deriveCapstoneStatus(definition: AcademicAssessmentDefinition, course: Course, progress: CourseProgress): AcademicAssessmentStatus {
  const capstone = progress.capstone;
  if (definition.sourceLocations.some(location => locationHasReview(progress, location))) return { definition, status: "needs-review", evidence: "none" };
  const evidence = capstoneEvidenceState(course, progress);
  if (evidence === "none") return { definition, status: "not-started", evidence: "none" };
  if (evidence === "in-progress") return { definition, status: "in-progress", evidence: "none" };
  return { definition, ...statusForEvidence(evidence === "verified" ? "verified" : evidence === "self-assessed" ? "self-assessed" : "none") };
}

function deriveCumulativeStatus(definition: AcademicAssessmentDefinition, course: Course, progress: CourseProgress): AcademicAssessmentStatus {
  const capstone = progress.capstone;
  if (definition.sourceLocations.some(location => locationHasReview(progress, location))) return { definition, status: "needs-review", evidence: "none" };
  const evidence = capstoneEvidenceState(course, progress);
  if (evidence === "none") return { definition, status: "not-started", evidence: "none" };
  if (evidence === "in-progress") return { definition, status: "in-progress", evidence: "none" };
  return { definition, ...statusForEvidence(evidence === "verified" ? "verified" : evidence === "self-assessed" ? "self-assessed" : "none") };
}

export function deriveAcademicAssessmentStatus(definition: AcademicAssessmentDefinition, course: Course, progress: CourseProgress): AcademicAssessmentStatus {
  switch (definition.kind) {
    case "quiz": return deriveQuizStatus(definition, progress);
    case "mastery-gate": return deriveMasteryGateStatus(definition, course, progress);
    case "unit-assessment": return deriveUnitAssessmentStatus(definition, course, progress);
    case "capstone": return deriveCapstoneStatus(definition, course, progress);
    case "cumulative-assessment": return deriveCumulativeStatus(definition, course, progress);
    default: return deriveQuizStatus(definition, progress);
  }
}

export function assessmentIsReviewable(status: AcademicAssessmentStatus, progress: CourseProgress): boolean {
  if (!(["complete", "self-assessed", "rubric-verified"] as AcademicItemStatus[]).includes(status.status)) return false;
  return status.definition.sourceLocations.length > 0
    && sourceActivitiesComplete(status.definition, progress).length === status.definition.sourceLocations.length
    && !status.definition.sourceLocations.some(location => locationHasReview(progress, location));
}

function unitModule(course: Course, unit: AcademicUnitDefinition) { return course.modules.find(module => module.id === unit.moduleId); }

export function isAcademicLocationUnlocked(course: Course, progress: CourseProgress, location: CourseLocation, allowCompletedReview = false): boolean {
  const lessonProgress = progress.lessonProgress[location.lessonId];
  if (!lessonProgress) return false;
  if (lessonProgress.completedActivityIds.includes(location.activityId)) return allowCompletedReview;
  return courseLocationKey(resolveResumePoint(course, progress)) === courseLocationKey(location);
}

function unitAcademicWorkComplete(unit: AcademicUnitDefinition, course: Course, progress: CourseProgress): boolean {
  const module = course.modules.find(item => item.id === unit.moduleId);
  if (!module || !module.lessons.length || !module.lessons.every(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed")) return false;
  if (module.moduleAssessment && progress.moduleProgress[module.id]?.assessmentPassed !== true) return false;
  return true;
}

export function deriveAcademicUnitAvailability(unit: AcademicUnitDefinition, course: Course, progress: CourseProgress): AcademicUnitAvailability {
  const module = course.modules.find(item => item.id === unit.moduleId);
  const firstLocation = module?.lessons[0]?.activities[0] ? { moduleId: module.id, lessonId: module.lessons[0].id, activityId: module.lessons[0].activities[0].id } : undefined;
  if (!module || !firstLocation) return { unit, state: "locked", reviewOnly: false, reason: "Unit has no authored launch location." };
  if (unitAcademicWorkComplete(unit, course, progress)) return { unit, state: "completed", launchLocation: firstLocation, reviewOnly: true, reason: "Academic work is complete; the unit remains available for read-only review." };
  if (progress.current.moduleId === unit.moduleId && !progress.completedAt) {
    const launchLocation = resolveResumePoint(course, progress);
    const fresh = launchLocation.moduleId === unit.moduleId && launchLocation.lessonId === firstLocation.lessonId && launchLocation.activityId === firstLocation.activityId && !progress.lessonProgress[firstLocation.lessonId]?.completedActivityIds.includes(firstLocation.activityId);
    return { unit, state: fresh ? "available" : "current", launchLocation, reviewOnly: false, reason: fresh ? "Unit is the next authored starting point." : "Continue from the authoritative CourseProgress resume point." };
  }
  return { unit, state: "locked", launchLocation: firstLocation, reviewOnly: false, reason: "Locked by authored prerequisite/current-course progression." };
}

export function deriveAcademicUnitStatus(unit: AcademicUnitDefinition, catalog: AcademicCatalog, course: Course, progress: CourseProgress, engagement: AcademicEngagementState): AcademicUnitStatusView {
  const module = unitModule(course, unit);
  const lessons = module?.lessons ?? [];
  const completedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed").length;
  const verifiedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "verified").length;
  const selfAssessedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "self-assessed").length;
  const needsReviewLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "needs-review").length;
  const readings = catalog.courses[0]?.readings.filter(reading => reading.unitId === unit.id) ?? [];
  const assignments = catalog.courses[0]?.assignments.filter(assignment => assignment.unitId === unit.id).map(def => deriveAcademicAssignmentStatus(def, course, progress)) ?? [];
  const assessments = catalog.courses[0]?.assessments.filter(assessment => assessment.unitId === unit.id).map(def => deriveAcademicAssessmentStatus(def, course, progress)) ?? [];
  const academicWorkComplete = completedLessons === lessons.length && assignments.every(item => item.status === "complete" || item.status === "rubric-verified") && assessments.filter(item => item.definition.required).every(item => ["complete", "rubric-verified", "self-assessed"].includes(item.status));
  const status: AcademicUnitStatus = academicWorkComplete ? "academic-work-complete" : needsReviewLessons ? "needs-review" : completedLessons ? "in-progress" : "not-started";
  return { unit, status, completedLessons, totalLessons: lessons.length, lessonsStarted: lessons.filter(lesson => progress.lessonProgress[lesson.id]?.completedActivityIds.length).length, readingsCompleted: readings.filter(reading => readingIsComplete(engagement, reading.id)).length, readingsTotal: readings.length, verifiedLessons, selfAssessedLessons, needsReviewLessons, assignments, assessments };
}

export function academicRecordSummary(catalog: AcademicCatalog, course: Course, progress: CourseProgress, engagement: AcademicEngagementState): AcademicRecordSummary {
  const academicCourse = catalog.courses.find(item => item.courseId === course.id);
  if (!academicCourse) throw new Error(`Academic course missing: ${course.id}`);
  const unitStatuses = academicCourse.units.map(unit => deriveAcademicUnitStatus(unit, catalog, course, progress, engagement));
  const assignments = academicCourse.assignments.map(def => deriveAcademicAssignmentStatus(def, course, progress));
  const assessments = academicCourse.assessments.map(def => deriveAcademicAssessmentStatus(def, course, progress));
  return { unitStatuses, assignments, assessments, courseComplete: Boolean(progress.completedAt), readingEngagementCount: Object.keys(engagement.readingCompletions).length, requiredReadingCount: academicCourse.readings.filter(reading => reading.required).length, progress };
}

export function academicStatusLabel(status: AcademicItemStatus | AcademicUnitStatus): string { return status.replaceAll("-", " ").replace(/\b\w/g, value => value.toUpperCase()); }


