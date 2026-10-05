import type { ContentBundle } from "../content/validate";
import {
  completeActivity, completeRemediation, createCourseProgress as createModernCourseProgress,
  loadCourseProgress as loadModernCourseProgress, saveCourseProgress as saveModernCourseProgress,
  sanitizeCourseProgress
} from "../course/progress";
import type { ActivityOutcome, Course, CourseActivity, CourseLocation, CourseProgress as ModernCourseProgress } from "../course/types";
import type { InstructorMode } from "../instructor/types";
import type { AcademicCatalog } from "../academic/types";
import type { LectureCatalog } from "../lecture/types";
import type { LabCatalog } from "../labs/types";
import type { CoursePackageDocument, PackageCapability } from "./packageTypes";

export interface CourseRuntimeContext {
  package: CoursePackageDocument;
  course: Course;
  capabilities: PackageCapability[];
  instructorProfile?: CoursePackageDocument["instructor"];
  academicCatalog?: AcademicCatalog;
  lectures?: LectureCatalog;
  labs?: LabCatalog;
  progressNamespace: string;
}

/** No authored field is reconstructed at the runtime boundary. */
export function packageToCourse(document: CoursePackageDocument): Course { return document.course; }
export function packageLectureToModern(document: CoursePackageDocument, _course: Course): LectureCatalog | undefined { return document.lectures; }
export function packageAcademicToModern(document: CoursePackageDocument, _course: Course): AcademicCatalog | undefined { return document.academic; }
export function packageLabsToModern(document: CoursePackageDocument): LabCatalog | undefined { return document.labs; }

export function createCourseRuntimeContext(document: CoursePackageDocument): CourseRuntimeContext {
  const course = packageToCourse(document);
  return {
    package: document,
    course,
    capabilities: [...document.manifest.capabilities],
    instructorProfile: document.instructor,
    academicCatalog: packageAcademicToModern(document, course),
    lectures: packageLectureToModern(document, course),
    labs: packageLabsToModern(document),
    progressNamespace: `${document.manifest.packageId}@${document.manifest.courseVersion}`
  };
}
export function hasCapability(context: CourseRuntimeContext, capability: PackageCapability): boolean { return context.capabilities.includes(capability); }

export type CourseProgress = ModernCourseProgress & { packageId: string; completedLessonIds: string[]; completedUnitIds: string[]; assessmentAttempts: number; notes: string[]; };
function withCompatibility(progress: ModernCourseProgress, context: CourseRuntimeContext, extras?: Partial<CourseProgress>): CourseProgress {
  return {
    ...progress,
    packageId: context.package.manifest.packageId,
    completedLessonIds: context.course.modules.flatMap(module => module.lessons).filter(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed").map(lesson => lesson.id),
    completedUnitIds: context.course.modules.filter(module => module.lessons.every(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed")).map(module => module.id),
    assessmentAttempts: extras?.assessmentAttempts ?? 0,
    notes: extras?.notes ?? [],
    ...extras
  };
}
export function createCourseProgress(context: CourseRuntimeContext, now = new Date().toISOString()): CourseProgress { void now; return withCompatibility(createModernCourseProgress(context.course), context); }
export type CourseProgressMap = Record<string, CourseProgress>;
const PROGRESS_STORAGE_KEY = "skillforge-course-progress-v1";
export function loadCourseProgress(storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): CourseProgressMap {
  if (!storage) return {};
  try { const value = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? "{}") as unknown; return value && typeof value === "object" && !Array.isArray(value) ? value as CourseProgressMap : {}; } catch { return {}; }
}
export function saveCourseProgress(progress: CourseProgressMap, storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch { /* optional browser storage */ } }
export function enrollCourse(map: CourseProgressMap, context: CourseRuntimeContext, _now?: string): CourseProgressMap { const key = context.progressNamespace; return map[key] ? map : { ...map, [key]: createCourseProgress(context) }; }
export function completeAuthoredActivity(context: CourseRuntimeContext, progress: CourseProgress, location: CourseLocation, outcome: ActivityOutcome = { passed: true, masteryEvidence: "self-assessed" }): CourseProgress {
  return withCompatibility(completeActivity(context.course, progress, location, outcome), context, { assessmentAttempts: progress.assessmentAttempts, notes: progress.notes });
}
export function isFormalActivity(activity: CourseActivity | undefined): activity is Extract<CourseActivity, { type: "mastery_check" | "module_assessment" | "capstone_activity" }> { return activity?.type === "mastery_check" || activity?.type === "module_assessment" || activity?.type === "capstone_activity"; }
export interface AssessmentEvaluatorPort { evaluate(activity: Extract<CourseActivity, { type: "mastery_check" | "module_assessment" | "capstone_activity" }>, response: string, stage?: number): ActivityOutcome; }
function invalidFormalOutcome(activityId: string, response: string, stage: number | undefined, validationErrors: string[]): ActivityOutcome {
  return { passed: false, score: 0, response, stage, masteryEvidence: "none", assessment: { activityId, passed: false, score: 0, semanticAvailable: false, provenance: "invalid-semantic", masteryEvidence: "none", criteria: [], missingConceptIds: [], misconceptionIds: [], feedback: "This formal activity has no valid deterministic evaluation contract.", semanticContractValid: false, validationErrors } };
}
export const deterministicRubricEvaluator: AssessmentEvaluatorPort = {
  evaluate(activity, response, stage) {
    const passScore = activity.passScore;
    const criteria = activity.rubric.requiredConcepts;
    if (!Number.isFinite(passScore) || passScore <= 0 || passScore > 1) return invalidFormalOutcome(activity.id, response, stage, ["passScore must be greater than 0 and no greater than 1"]);
    if (!criteria.length) return invalidFormalOutcome(activity.id, response, stage, ["mastery rubric must contain at least one criterion"]);
    const text = response.trim().toLocaleLowerCase();
    const results = criteria.map(item => {
      const terms = [...item.keywords, ...(item.patterns ?? [])].filter(term => typeof term === "string" && term.trim()).map(term => term.toLocaleLowerCase());
      const met = terms.length > 0 && terms.some(term => text.includes(term));
      return { id: item.id, label: item.label, met, status: (met ? "met" : "missing") as "met" | "missing" };
    });
    const unsupported = criteria.filter(item => item.required !== false && ![...item.keywords, ...(item.patterns ?? [])].some(term => typeof term === "string" && term.trim()));
    if (unsupported.length) return invalidFormalOutcome(activity.id, response, stage, unsupported.map(item => `required criterion ${item.id} has no evaluable authored signal`));
    const required = results.filter((_, index) => criteria[index].required !== false);
    const met = required.filter(item => item.met).length;
    const score = required.length ? met / required.length : 0;
    const passed = score >= passScore;
    return { passed, score, response, stage, masteryEvidence: passed ? "self-assessed" : "none", assessment: { activityId: activity.id, passed, score, semanticAvailable: true, provenance: "semantic", masteryEvidence: passed ? "self-assessed" : "none", criteria: results, missingConceptIds: results.filter(item => !item.met).map(item => item.id), misconceptionIds: [], feedback: passed ? "Authored criteria met." : "Review the missing authored criteria and retry.", semanticContractValid: true } };
  }
};
export function evaluateAuthoredActivityResponse(context: CourseRuntimeContext, location: CourseLocation, response: string, stage?: number): ActivityOutcome {
  const activity = context.course.modules.flatMap(module => module.lessons).flatMap(lesson => lesson.activities).find(item => item.id === location.activityId);
  if (!activity) return { passed: false, note: "The authored activity could not be found." };
  const text = response.trim();
  if (activity.type === "instruction" || activity.type === "concept_explanation") return { passed: true, masteryEvidence: "self-assessed", response: text };
  if (activity.type === "remediation") return text ? { passed: true, masteryEvidence: "self-assessed", response: text } : { passed: false, note: "Remediation requires a response." };
  if (!text) return { passed: false, score: 0, response: text, note: "A response is required before this activity can be evaluated." };
  if (!isFormalActivity(activity)) return { passed: true, masteryEvidence: "self-assessed", response: text, note: "Authored practice response recorded." };
  return deterministicRubricEvaluator.evaluate(activity, text, stage);
}
export function applyAuthoredActivityResponse(context: CourseRuntimeContext, progress: CourseProgress, location: CourseLocation, response: string, stage?: number): CourseProgress {
  const activity = context.course.modules.flatMap(module => module.lessons).flatMap(lesson => lesson.activities).find(item => item.id === location.activityId);
  const outcome = evaluateAuthoredActivityResponse(context, location, response, stage);
  const next = activity?.type === "remediation" && outcome.passed ? completeRemediation(context.course, progress, location) : completeAuthoredActivity(context, progress, location, outcome);
  return withCompatibility(next, context, { assessmentAttempts: isFormalActivity(activity) ? progress.assessmentAttempts + 1 : progress.assessmentAttempts, notes: progress.notes });
}
export function recordAssessmentAttempt(progress: CourseProgress): CourseProgress { return { ...progress, assessmentAttempts: progress.assessmentAttempts + 1, updatedAt: new Date().toISOString() }; }
export interface InstructorResponse { mode: InstructorMode; basis: "fallback"; message: string; canChangeProgress: false; evidenceIds: string[]; }
export function deterministicInstructorFallback(context: CourseRuntimeContext, mode: InstructorMode, learnerQuestion: string): InstructorResponse {
  const role = context.instructorProfile?.displayRole ?? "SkillForge Instructor"; const focus = context.instructorProfile?.subjectScope ?? context.course.title; const prompt = learnerQuestion.trim() || "the current activity";
  return { mode, basis: "fallback", message: `${role} is bounded to ${focus}. Start with the authored course material for “${prompt}”, state the evidence you can verify, and identify what would need further practice.`, canChangeProgress: false, evidenceIds: [] };
}
export function publicContentToPlatformNote(content: ContentBundle): string { return `${content.certifications.length} public certification packages are available through the generic registry.`; }
