import type { ContentBundle } from "../content/validate";
import type { CoursePackageDocument, CoursePackageLab, CoursePackageLabAction, InstructorMode, PackageCapability } from "./packageTypes";

export interface CourseRuntimeContext {
  package: CoursePackageDocument;
  course: CoursePackageDocument["course"];
  capabilities: PackageCapability[];
  instructorProfile?: CoursePackageDocument["instructor"];
  lectures?: CoursePackageDocument["lectures"];
  labs?: CoursePackageDocument["labs"];
  progressNamespace: string;
}

export interface CourseProgress {
  packageId: string;
  courseId: string;
  courseVersion: string;
  enrolledAt: string;
  lastActivityAt: string;
  completedLessonIds: string[];
  completedUnitIds: string[];
  assessmentAttempts: number;
  notes: string[];
}

export type CourseProgressMap = Record<string, CourseProgress>;

const PROGRESS_STORAGE_KEY = "skillforge-course-progress-v1";

export function createCourseRuntimeContext(document: CoursePackageDocument): CourseRuntimeContext {
  return {
    package: document,
    course: document.course,
    capabilities: [...document.manifest.capabilities],
    instructorProfile: document.instructor,
    lectures: document.lectures,
    labs: document.labs,
    progressNamespace: `${document.manifest.packageId}@${document.manifest.courseVersion}`
  };
}

export function hasCapability(context: CourseRuntimeContext, capability: PackageCapability): boolean {
  return context.capabilities.includes(capability);
}

export function createCourseProgress(context: CourseRuntimeContext, now = new Date().toISOString()): CourseProgress {
  return { packageId: context.package.manifest.packageId, courseId: context.course.id, courseVersion: context.package.manifest.courseVersion, enrolledAt: now, lastActivityAt: now, completedLessonIds: [], completedUnitIds: [], assessmentAttempts: 0, notes: [] };
}

export function loadCourseProgress(storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): CourseProgressMap {
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as CourseProgressMap : {};
  } catch { return {}; }
}

export function saveCourseProgress(progress: CourseProgressMap, storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  try { storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch { /* local storage is optional */ }
}

export function enrollCourse(map: CourseProgressMap, context: CourseRuntimeContext, now = new Date().toISOString()): CourseProgressMap {
  const key = context.progressNamespace;
  return map[key] ? map : { ...map, [key]: createCourseProgress(context, now) };
}

export function completeLesson(progress: CourseProgress, lessonId: string, unitId: string, now = new Date().toISOString()): CourseProgress {
  const lessonIds = progress.completedLessonIds.includes(lessonId) ? progress.completedLessonIds : [...progress.completedLessonIds, lessonId];
  return { ...progress, lastActivityAt: now, completedLessonIds: lessonIds, completedUnitIds: progress.completedUnitIds.includes(unitId) ? progress.completedUnitIds : progress.completedUnitIds };
}

export function recordAssessmentAttempt(progress: CourseProgress, now = new Date().toISOString()): CourseProgress {
  return { ...progress, assessmentAttempts: progress.assessmentAttempts + 1, lastActivityAt: now };
}

export interface InstructorResponse {
  mode: InstructorMode;
  basis: "fallback";
  message: string;
  canChangeProgress: false;
  evidenceIds: string[];
}

export function deterministicInstructorFallback(context: CourseRuntimeContext, mode: InstructorMode, learnerQuestion: string): InstructorResponse {
  const role = context.instructorProfile?.displayRole ?? "SkillForge Instructor";
  const focus = context.instructorProfile?.subjectScope ?? context.course.title;
  const prompt = learnerQuestion.trim() || "the current lesson";
  return { mode, basis: "fallback", message: `${role} is bounded to ${focus}. Start with the authored course material for “${prompt}”, state the evidence you can verify, and identify what would need further practice.`, canChangeProgress: false, evidenceIds: [] };
}

export interface LocalLabRun {
  labId: string;
  currentStepId: string;
  visitedStepIds: string[];
  state: Record<string, string | number | boolean>;
  completed: boolean;
}

export function createLocalLabRun(lab: CoursePackageLab): LocalLabRun {
  return { labId: lab.id, currentStepId: lab.steps[0]?.id ?? "", visitedStepIds: lab.steps[0] ? [lab.steps[0].id] : [], state: { ...lab.initialState }, completed: false };
}

function compare(left: unknown, operator: string, right: unknown): boolean {
  if (operator === "equals") return left === right;
  if (operator === "not-equals") return left !== right;
  if (operator === "greater-than") return typeof left === "number" && typeof right === "number" && left > right;
  if (operator === "less-than") return typeof left === "number" && typeof right === "number" && left < right;
  return false;
}

function conditionsPass(run: LocalLabRun, conditions: { key: string; operator: string; value: string | number | boolean }[] | undefined): boolean {
  return (conditions ?? []).every(condition => compare(run.state[condition.key], condition.operator, condition.value));
}

export function applyLocalLabAction(lab: CoursePackageLab, run: LocalLabRun, stepId: string, actionId: string): LocalLabRun {
  const step = lab.steps.find(item => item.id === stepId);
  const action = lab.actions.find(item => item.id === actionId);
  if (!step || step.kind !== "action" || run.currentStepId !== stepId || !step.actionIds?.includes(actionId) || !action || !conditionsPass(run, action.preconditions)) return run;
  const state = { ...run.state };
  action.effects.forEach(effect => { const current = state[effect.key]; state[effect.key] = effect.operation === "increment" && typeof current === "number" && typeof effect.value === "number" ? current + effect.value : effect.value; });
  const next = lab.steps.find(item => item.number === step.number + 1);
  return { ...run, state, currentStepId: next?.id ?? run.currentStepId, visitedStepIds: next ? [...run.visitedStepIds, next.id] : run.visitedStepIds };
}

export function evaluateLocalLabChecks(lab: CoursePackageLab, run: LocalLabRun): boolean {
  return lab.checks.every(check => conditionsPass(run, check.conditions));
}

export function publicContentToPlatformNote(content: ContentBundle): string {
  return `${content.certifications.length} public certification packages are available through the generic registry.`;
}
