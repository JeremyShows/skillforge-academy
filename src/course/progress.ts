import type {
  ActivityOutcome, ClassSession, Course, CourseActivity, CourseLocation, CourseProgress,
  CourseValidationIssue, LessonProgress, MasteryState, ModuleProgress, AcademicMasteryState, CapstoneProgress, MasteryEvidence
} from "./types";
import { isNativeLearnerStateStore, learnerStateStore } from "../state/learnerState";

export const COURSE_PROGRESS_KEY = "skillforge-course-progress-v1";
export const MAX_COURSE_CHECKPOINT_CHARS = 5 * 1024 * 1024;

const REVIEW_REASONS = new Set(["failed-mastery", "weak-response", "high-confidence-error", "manual-review"]);

const now = () => new Date().toISOString();
let fallbackSessionSequence = 0;

export function activityKey(lessonId: string, activityId: string): string {
  return `${lessonId}::${activityId}`;
}

export function allLessons(course: Course) {
  return course.modules.flatMap(module => module.lessons.map(lesson => ({ module, lesson })));
}

function allRequiredActivitiesComplete(course: Course, progress: CourseProgress): boolean {
  return allLessons(course).every(({ lesson }) => lesson.activities.filter(activity => activity.required !== false).every(activity => progress.lessonProgress[lesson.id]?.completedActivityIds.includes(activity.id)));
}

export function firstLocation(course: Course): CourseLocation {
  const module = course.modules[0];
  const lesson = module?.lessons[0];
  const activity = lesson?.activities[0];
  if (!module || !lesson || !activity) throw new Error(`Course ${course.id} has no first activity`);
  return { moduleId: module.id, lessonId: lesson.id, activityId: activity.id };
}

function emptyLessonProgress(): LessonProgress {
  return { state: "not-started", completionState: "not-started", completedActivityIds: [], mastery: "not-started", masteryState: "not-assessed", masteryEvidence: "none", attempts: 0, remediationCount: 0, updatedAt: now() };
}

function emptyModuleProgress(): ModuleProgress {
  return { completedLessonIds: [], mastery: "not-started", completionState: "not-started", masteryState: "not-assessed", updatedAt: now() };
}

function emptyCapstoneProgress(course: Course): CapstoneProgress {
  return { currentStage: 1, completedStageNumbers: [], responses: {}, assessments: {}, assistedStageNumbers: [], finalIntegrationPassed: false, updatedAt: now() };
}

export function createCourseProgress(course: Course): CourseProgress {
  const lessonProgress: Record<string, LessonProgress> = {};
  const moduleProgress: Record<string, ModuleProgress> = {};
  for (const module of course.modules) {
    moduleProgress[module.id] = emptyModuleProgress();
    for (const lesson of module.lessons) lessonProgress[lesson.id] = emptyLessonProgress();
  }
  return {
    courseId: course.id,
    courseVersion: course.version,
    contentVersion: course.contentVersion,
    current: firstLocation(course),
    lessonProgress,
    moduleProgress,
    reviewQueue: [],
    sessions: [],
    assistedActivityIds: [],
    capstone: emptyCapstoneProgress(course),
    weaknessTags: [],
    updatedAt: now()
  };
}

function validLocation(course: Course, location: unknown): location is CourseLocation {
  if (!location || typeof location !== "object") return false;
  const candidate = location as Partial<CourseLocation>;
  if (typeof candidate.moduleId !== "string" || typeof candidate.lessonId !== "string" || typeof candidate.activityId !== "string") return false;
  const module = course.modules.find(item => item.id === candidate.moduleId);
  const lesson = module?.lessons.find(item => item.id === candidate.lessonId);
  return Boolean(lesson?.activities.some(activity => activity.id === candidate.activityId));
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function cloneProgress(progress: CourseProgress): CourseProgress {
  return JSON.parse(JSON.stringify(progress)) as CourseProgress;
}

export function sanitizeCourseProgress(raw: unknown, course: Course): CourseProgress {
  const fresh = createCourseProgress(course);
  if (!raw || typeof raw !== "object") return fresh;
  const candidate = raw as Partial<CourseProgress>;
  if (candidate.courseId !== course.id || candidate.courseVersion !== course.version) return fresh;
  const next = cloneProgress(fresh);
  const saved = candidate as CourseProgress;
  if (validLocation(course, saved.current)) next.current = saved.current;
  for (const { lesson } of allLessons(course)) {
    const value = saved.lessonProgress?.[lesson.id];
    if (!value) continue;
    const completedActivityIds = Array.isArray(value.completedActivityIds) ? value.completedActivityIds : [];
    const completed = lesson.activities.map(activity => activity.id).filter(id => completedActivityIds.includes(id));
    const masteryEvidence = lesson.masteryRule.requiredActivityIds.every(id => completed.includes(id)) && completed.includes(lesson.masteryRule.gateActivityId);
    const hasProgress = completed.length > 0;
    const completionState = masteryEvidence ? "completed" : hasProgress ? "in-progress" : "not-started";
    const legacyMastery = masteryEvidence ? "mastered" : hasProgress ? "needs-review" : "not-started";
    const masteryState: AcademicMasteryState = masteryEvidence
      ? value.masteryState === "verified" || value.masteryEvidence === "verified" ? "verified" : "self-assessed"
      : value.masteryState === "needs-review" || value.mastery === "needs-review" ? "needs-review" : "not-assessed";
    next.lessonProgress[lesson.id] = {
      ...emptyLessonProgress(),
      ...value,
      completedActivityIds: completed,
      state: completionState,
      completionState,
      mastery: legacyMastery,
      masteryState,
      masteryEvidence: masteryState === "verified" ? "verified" : masteryState === "self-assessed" ? "self-assessed" : "none",
      attempts: Number.isFinite(value.attempts) ? Math.max(0, value.attempts) : 0,
      remediationCount: Number.isFinite(value.remediationCount) ? Math.max(0, value.remediationCount) : 0,
      remediationPathId: typeof value.remediationPathId === "string" ? value.remediationPathId : undefined,
      updatedAt: validTimestamp(value.updatedAt) ? value.updatedAt : now()
    };
  }
  for (const module of course.modules) {
    const value = saved.moduleProgress?.[module.id];
    if (!value) continue;
    const assessmentRequired = Boolean(module.moduleAssessment);
    const moduleState: ModuleProgress = {
      ...emptyModuleProgress(),
      ...value,
      completedLessonIds: module.lessons.map(lesson => lesson.id).filter(lessonId => next.lessonProgress[lessonId]?.mastery === "mastered"),
      mastery: module.lessons.every(lesson => next.lessonProgress[lesson.id]?.mastery === "mastered") ? "mastered" : module.lessons.some(lesson => next.lessonProgress[lesson.id]?.mastery === "mastered" || next.lessonProgress[lesson.id]?.mastery === "needs-review") ? "needs-review" : "not-started",
      completionState: module.lessons.every(lesson => next.lessonProgress[lesson.id]?.completionState === "completed") ? "completed" : module.lessons.some(lesson => next.lessonProgress[lesson.id]?.completionState !== "not-started") ? "in-progress" : "not-started",
      masteryState: value.masteryState ?? (module.lessons.every(lesson => next.lessonProgress[lesson.id]?.masteryState === "verified") ? "verified" : module.lessons.every(lesson => ["verified", "self-assessed"].includes(next.lessonProgress[lesson.id]?.masteryState ?? "not-assessed")) ? "self-assessed" : "not-assessed"),
      updatedAt: validTimestamp(value.updatedAt) ? value.updatedAt : now()
    };
    if (assessmentRequired) {
      moduleState.assessmentPassed = Boolean(value.assessmentPassed);
      moduleState.assessmentEvidence = value.assessmentEvidence === "verified" ? "verified" : value.assessmentEvidence === "self-assessed" ? "self-assessed" : "none";
    } else {
      delete moduleState.assessmentPassed;
      delete moduleState.assessmentEvidence;
    }
    next.moduleProgress[module.id] = moduleState;
  }
  for (const module of course.modules) updateModuleState(course, next, module.id);
  next.reviewQueue = Array.isArray(saved.reviewQueue) ? saved.reviewQueue.filter(item => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as CourseProgress["reviewQueue"][number];
    const moduleId = course.modules.find(module => module.lessons.some(lesson => lesson.id === candidate.lessonId))?.id;
    return typeof candidate.id === "string" && typeof candidate.lessonId === "string" && typeof candidate.activityId === "string" && typeof candidate.concept === "string" && REVIEW_REASONS.has(candidate.reason) && validTimestamp(candidate.createdAt) && validLocation(course, { moduleId: moduleId ?? "", lessonId: candidate.lessonId, activityId: candidate.activityId });
  }) : [];
  const reviewKeys = new Set<string>();
  next.reviewQueue = next.reviewQueue.filter(item => {
    const key = `${item.lessonId}::${item.activityId}::${item.reason}`;
    if (reviewKeys.has(key)) return false;
    reviewKeys.add(key);
    return true;
  }).slice(0, 100);
  next.weaknessTags = Array.isArray(saved.weaknessTags) ? [...new Set(saved.weaknessTags.filter(tag => typeof tag === "string"))].slice(0, 50) : [];
  const gates = new Set(allLessons(course).flatMap(({ lesson }) => lesson.activities.filter(activityIsGate).map(activity => activity.id)));
  next.assistedActivityIds = Array.isArray(saved.assistedActivityIds) ? [...new Set(saved.assistedActivityIds.filter(id => typeof id === "string" && gates.has(id)))].slice(0, 100) : [];
  const savedCapstone = saved.capstone;
  if (savedCapstone && typeof savedCapstone === "object") {
    const maxStage = (course.capstone.stages?.length ?? 0) + 1;
    const currentStage = Number.isInteger(savedCapstone.currentStage) ? Math.max(1, Math.min(maxStage, savedCapstone.currentStage)) : 1;
    next.capstone = {
      ...emptyCapstoneProgress(course),
      currentStage,
      completedStageNumbers: Array.isArray(savedCapstone.completedStageNumbers) ? [...new Set(savedCapstone.completedStageNumbers.filter(stage => Number.isInteger(stage) && stage >= 1 && stage < maxStage))] : [],
      responses: savedCapstone.responses && typeof savedCapstone.responses === "object" ? Object.fromEntries(Object.entries(savedCapstone.responses).filter(([stage, response]) => /^\d+$/.test(stage) && typeof response === "string")) : {},
      assessments: savedCapstone.assessments && typeof savedCapstone.assessments === "object" ? savedCapstone.assessments : {},
      assistedStageNumbers: Array.isArray(savedCapstone.assistedStageNumbers) ? [...new Set(savedCapstone.assistedStageNumbers.filter(stage => Number.isInteger(stage) && stage >= 1 && stage <= maxStage))] : [],
      finalIntegrationPassed: Boolean(savedCapstone.finalIntegrationPassed),
      updatedAt: validTimestamp(savedCapstone.updatedAt) ? savedCapstone.updatedAt : now()
    };
  }
  next.sessions = Array.isArray(saved.sessions) ? saved.sessions.filter(session => session && typeof session.id === "string" && session.courseId === course.id && validTimestamp(session.startedAt) && validTimestamp(session.lastActivityAt) && (!session.endedAt || validTimestamp(session.endedAt)) && ["active", "paused", "completed"].includes(session.status) && ["guided", "remediation", "review"].includes(session.mode) && (!session.current || validLocation(course, session.current))).slice(-100) : [];
  next.activeSessionId = typeof saved.activeSessionId === "string" && next.sessions.some(session => session.id === saved.activeSessionId && session.status === "active") ? saved.activeSessionId : undefined;
  next.sessionStartedAt = validTimestamp(saved.sessionStartedAt) ? saved.sessionStartedAt : undefined;
  next.completedAt = validTimestamp(saved.completedAt) && allRequiredActivitiesComplete(course, next) ? saved.completedAt : undefined;
  next.updatedAt = validTimestamp(saved.updatedAt) ? saved.updatedAt : now();
  return next;
}

export function resolveResumePoint(course: Course, progress: CourseProgress): CourseLocation {
  if (progress.completedAt) return firstLocation(course);
  if (validLocation(course, progress.current)) {
    const lessonProgress = progress.lessonProgress[progress.current.lessonId];
    const currentLesson = course.modules.flatMap(module => module.lessons).find(lesson => lesson.id === progress.current.lessonId);
    const currentActivity = currentLesson?.activities.find(activity => activity.id === progress.current.activityId);
    if (currentActivity && !lessonProgress?.completedActivityIds.includes(progress.current.activityId) && (currentActivity.required !== false || currentActivity.type === "remediation")) return progress.current;
  }
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const state = progress.lessonProgress[lesson.id] ?? emptyLessonProgress();
      const next = lesson.activities.find(activity => activity.required !== false && !state.completedActivityIds.includes(activity.id));
      if (next) return { moduleId: module.id, lessonId: lesson.id, activityId: next.id };
    }
  }
  return firstLocation(course);
}

export function markActivityStarted(progress: CourseProgress, location: CourseLocation): CourseProgress {
  const next = cloneProgress(progress);
  const lesson = next.lessonProgress[location.lessonId] ?? emptyLessonProgress();
  lesson.state = "in-progress";
  lesson.updatedAt = now();
  next.lessonProgress[location.lessonId] = lesson;
  next.current = location;
  const timestamp = now();
  const active = next.activeSessionId ? next.sessions.find(session => session.id === next.activeSessionId) : undefined;
  if (active) {
    active.lastActivityAt = timestamp;
    active.current = location;
    if (location.activityId.includes("remediate")) active.mode = "remediation";
  } else {
    next.sessionStartedAt = timestamp;
    const generatedId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}:${fallbackSessionSequence++}`;
    const session: ClassSession = { id: `${next.courseId}:${generatedId}`, courseId: next.courseId, startedAt: timestamp, lastActivityAt: timestamp, status: "active", mode: location.activityId.includes("remediate") ? "remediation" : "guided", current: location };
    next.sessions = [...next.sessions.slice(-99), session];
    next.activeSessionId = session.id;
  }
  next.updatedAt = now();
  return next;
}

/** Instructor help is useful, but it marks the active mastery response assisted. */
export function markMasteryAssisted(progress: CourseProgress, location: CourseLocation): CourseProgress {
  const next = cloneProgress(progress);
  if (!next.assistedActivityIds.includes(location.activityId)) next.assistedActivityIds.push(location.activityId);
  next.updatedAt = now();
  return next;
}

export function endClassSession(progress: CourseProgress, status: Exclude<ClassSession["status"], "active"> = "paused"): CourseProgress {
  const next = cloneProgress(progress);
  const active = next.activeSessionId ? next.sessions.find(session => session.id === next.activeSessionId) : undefined;
  if (active) {
    active.status = status;
    active.endedAt = now();
    active.lastActivityAt = active.endedAt;
  }
  next.activeSessionId = undefined;
  next.updatedAt = now();
  return next;
}

function nextLocation(course: Course, location: CourseLocation, progress: CourseProgress): CourseLocation | undefined {
  const moduleIndex = course.modules.findIndex(module => module.id === location.moduleId);
  const module = course.modules[moduleIndex];
  const lessonIndex = module?.lessons.findIndex(lesson => lesson.id === location.lessonId) ?? -1;
  const lesson = module?.lessons[lessonIndex];
  const activityIndex = lesson?.activities.findIndex(activity => activity.id === location.activityId) ?? -1;
  const completed = lesson ? (progress.lessonProgress[lesson.id]?.completedActivityIds ?? []) : [];
  const nextActivity = lesson?.activities.slice(activityIndex + 1).find(activity => activity.required !== false && !completed.includes(activity.id));
  if (nextActivity && lesson) return { moduleId: module.id, lessonId: lesson.id, activityId: nextActivity.id };
  const earlierRequired = lesson?.activities.find(activity => activity.required !== false && !completed.includes(activity.id));
  if (earlierRequired && lesson) return { moduleId: module.id, lessonId: lesson.id, activityId: earlierRequired.id };
  const gate = lesson?.activities.find(activity => activity.id === lesson.masteryRule.gateActivityId);
  if (gate && lesson && !completed.includes(gate.id)) return { moduleId: module.id, lessonId: lesson.id, activityId: gate.id };
  const nextLesson = module?.lessons.slice(lessonIndex + 1).find(item => progress.lessonProgress[item.id]?.mastery !== "mastered");
  if (nextLesson) return { moduleId: module.id, lessonId: nextLesson.id, activityId: nextLesson.activities[0].id };
  const nextModule = course.modules.slice(moduleIndex + 1).find(item => item.lessons.length > 0);
  if (nextModule) return { moduleId: nextModule.id, lessonId: nextModule.lessons[0].id, activityId: nextModule.lessons[0].activities[0].id };
  return undefined;
}

function updateModuleState(course: Course, progress: CourseProgress, moduleId: string): void {
  const module = course.modules.find(item => item.id === moduleId);
  if (!module) return;
  const completed = module.lessons.filter(lesson => progress.lessonProgress[lesson.id]?.mastery === "mastered").map(lesson => lesson.id);
  const allLessonsComplete = completed.length === module.lessons.length;
  const assessmentRequired = Boolean(module.moduleAssessment);
  const assessmentPassed = progress.moduleProgress[module.id]?.assessmentPassed ?? false;
  const assessmentEvidence = progress.moduleProgress[module.id]?.assessmentEvidence ?? "none";
  const allLessonsVerified = module.lessons.every(lesson => progress.lessonProgress[lesson.id]?.masteryState === "verified");
  const allLessonsAssessed = module.lessons.every(lesson => ["verified", "self-assessed"].includes(progress.lessonProgress[lesson.id]?.masteryState ?? "not-assessed"));
  const assessmentSatisfied = !assessmentRequired || assessmentPassed;
  const masteryState: AcademicMasteryState = !allLessonsComplete || !assessmentSatisfied ? (completed.length ? "needs-review" : "not-assessed") : (!assessmentRequired || assessmentEvidence === "verified") && allLessonsVerified ? "verified" : allLessonsAssessed ? "self-assessed" : "needs-review";
  const moduleState: ModuleProgress = {
    completedLessonIds: completed,
    mastery: allLessonsComplete ? "mastered" : completed.length ? "needs-review" : "not-started",
    completionState: allLessonsComplete ? "completed" : completed.length ? "in-progress" : "not-started",
    masteryState,
    updatedAt: now()
  };
  if (assessmentRequired) {
    moduleState.assessmentPassed = assessmentPassed;
    moduleState.assessmentEvidence = assessmentEvidence;
  }
  progress.moduleProgress[module.id] = moduleState;
}

export function completeActivity(course: Course, progress: CourseProgress, location: CourseLocation, outcome: ActivityOutcome): CourseProgress {
  const next = markActivityStarted(progress, location);
  const lesson = course.modules.flatMap(module => module.lessons).find(item => item.id === location.lessonId);
  const activity = lesson?.activities.find(item => item.id === location.activityId);
  if (!lesson || !activity) return next;
  const lessonState = next.lessonProgress[lesson.id];
  const gate = activityIsGate(activity);
  const assisted = Boolean(outcome.assisted || next.assistedActivityIds.includes(activity.id));
  if (gate) next.assistedActivityIds = next.assistedActivityIds.filter(id => id !== activity.id);
  if (activity.type === "capstone_activity" && outcome.stage) {
    const capstone = next.capstone ?? emptyCapstoneProgress(course);
    const maximumStage = (course.capstone.stages?.length ?? 0) + 1;
    const stage = Math.max(1, Math.min(maximumStage, outcome.stage));
    if (assisted) {
      if (!capstone.assistedStageNumbers.includes(stage)) capstone.assistedStageNumbers.push(stage);
      next.capstone = { ...capstone, updatedAt: now() };
      addReviewItem(next, { id: `${location.lessonId}-${activity.id}-assisted-${stage}`, lessonId: location.lessonId, activityId: activity.id, reason: "manual-review", concept: `Fresh unassisted capstone stage ${stage}`, createdAt: now() });
      next.current = location;
      next.updatedAt = now();
      return next;
    }
    if (!outcome.passed) {
      next.capstone = { ...capstone, updatedAt: now() };
      next.lessonProgress[lesson.id].mastery = "needs-review";
      next.lessonProgress[lesson.id].masteryState = "needs-review";
      next.lessonProgress[lesson.id].masteryEvidence = "none";
      next.lessonProgress[lesson.id].attempts += 1;
      next.lessonProgress[lesson.id].returnToActivityId = activity.id;
      next.current = lesson.remediationActivityId ? { moduleId: location.moduleId, lessonId: location.lessonId, activityId: lesson.remediationActivityId } : location;
      addReviewItem(next, { id: `${lesson.id}-${activity.id}-stage-${stage}`, lessonId: lesson.id, activityId: activity.id, reason: "failed-mastery", concept: `Capstone stage ${stage}`, createdAt: now() });
      next.updatedAt = now();
      return next;
    }
    capstone.responses[String(stage)] = outcome.response ?? "";
    if (outcome.assessment) capstone.assessments[String(stage)] = outcome.assessment;
    if (!capstone.completedStageNumbers.includes(stage)) capstone.completedStageNumbers.push(stage);
    capstone.currentStage = Math.min(maximumStage, stage + 1);
    capstone.finalIntegrationPassed = stage === maximumStage;
    capstone.updatedAt = now();
    next.capstone = capstone;
    if (stage < maximumStage) {
      next.current = location;
      next.updatedAt = now();
      return next;
    }
  }
  if (!outcome.passed) {
    lessonState.mastery = gate ? "needs-review" : lessonState.mastery;
    lessonState.masteryState = gate ? "needs-review" : lessonState.masteryState;
    lessonState.masteryEvidence = gate ? "none" : lessonState.masteryEvidence;
    lessonState.attempts += gate ? 1 : 0;
    if (gate && lesson.remediationActivityId) {
      lessonState.remediationCount += 1;
      lessonState.returnToActivityId = activity.id;
      const remediation = lesson.activities.find(item => item.id === lesson.remediationActivityId);
      const signals = [...(outcome.assessment?.misconceptionIds ?? []), ...(outcome.assessment?.missingConceptIds ?? [])];
      lessonState.remediationPathId = remediation?.type === "remediation" ? signals.find(signal => Boolean(remediation.remediationPaths?.[signal])) : undefined;
      if (remediation) next.current = { moduleId: location.moduleId, lessonId: lesson.id, activityId: remediation.id };
    } else next.current = location;
    addReviewItem(next, { id: `${lesson.id}-${activity.id}-${gate ? "failed-mastery" : "weak-response"}`, lessonId: lesson.id, activityId: activity.id, reason: gate ? "failed-mastery" : "weak-response", concept: lesson.objectives[0] ?? lesson.title, createdAt: now() });
    next.weaknessTags = [...new Set([...next.weaknessTags, ...(outcome.weaknessTags ?? []), ...lesson.tags])].slice(-50);
    if (activity.type === "module_assessment") {
      const moduleState = next.moduleProgress[location.moduleId] ?? emptyModuleProgress();
      moduleState.assessmentPassed = false;
      moduleState.assessmentEvidence = "none";
      next.moduleProgress[location.moduleId] = moduleState;
      updateModuleState(course, next, location.moduleId);
    }
    next.updatedAt = now();
    return next;
  }
  if (gate && assisted) {
    lessonState.mastery = "needs-review";
    lessonState.masteryState = "needs-review";
    lessonState.masteryEvidence = "none";
    lessonState.attempts += 1;
    lessonState.returnToActivityId = activity.id;
    next.current = location;
    addReviewItem(next, { id: `${lesson.id}-${activity.id}-assisted`, lessonId: lesson.id, activityId: activity.id, reason: "manual-review", concept: "Fresh unassisted mastery retry", createdAt: now() });
    next.weaknessTags = [...new Set([...next.weaknessTags, "assisted-mastery-attempt"])].slice(-50);
    if (activity.type === "module_assessment") {
      const moduleState = next.moduleProgress[location.moduleId] ?? emptyModuleProgress();
      moduleState.assessmentPassed = false;
      moduleState.assessmentEvidence = "none";
      next.moduleProgress[location.moduleId] = moduleState;
      updateModuleState(course, next, location.moduleId);
    }
    next.updatedAt = now();
    return next;
  }
  if (!lessonState.completedActivityIds.includes(activity.id)) lessonState.completedActivityIds.push(activity.id);
  lessonState.lastScore = outcome.score ?? lessonState.lastScore;
  lessonState.state = "in-progress";
  lessonState.completionState = "in-progress";
  const requiredComplete = lesson.masteryRule.requiredActivityIds.every(id => lessonState.completedActivityIds.includes(id));
  if (activity.id === lesson.masteryRule.gateActivityId && requiredComplete) {
    lessonState.mastery = "mastered";
    lessonState.masteryEvidence = outcome.masteryEvidence ?? outcome.assessment?.masteryEvidence ?? "self-assessed";
    lessonState.masteryState = lessonState.masteryEvidence === "verified" ? "verified" : "self-assessed";
    lessonState.completionState = "completed";
    lessonState.state = "completed";
    lessonState.returnToActivityId = undefined;
    clearResolvedReviewItems(next, location);
    if (activity.type === "module_assessment") {
      const moduleState = next.moduleProgress[location.moduleId] ?? emptyModuleProgress();
      moduleState.assessmentPassed = true;
      moduleState.assessmentEvidence = lessonState.masteryEvidence;
      next.moduleProgress[location.moduleId] = moduleState;
    }
    updateModuleState(course, next, location.moduleId);
  }
  const following = nextLocation(course, location, next);
  if (allRequiredActivitiesComplete(course, next)) {
    next.completedAt = now();
    const active = next.activeSessionId ? next.sessions.find(session => session.id === next.activeSessionId) : undefined;
    if (active) {
      active.status = "completed";
      active.endedAt = now();
      active.lastActivityAt = active.endedAt;
      next.activeSessionId = undefined;
    }
    next.current = location;
  } else if (following) next.current = following;
  else {
    next.current = location;
  }
  next.updatedAt = now();
  return next;
}

export function completeRemediation(course: Course, progress: CourseProgress, location: CourseLocation): CourseProgress {
  const lesson = course.modules.flatMap(module => module.lessons).find(item => item.id === location.lessonId);
  const lessonState = lesson ? progress.lessonProgress[lesson.id] : undefined;
  if (!lesson || !lessonState || !lessonState.returnToActivityId) return completeActivity(course, progress, location, { passed: true });
  const next = completeActivity(course, progress, location, { passed: true });
  next.current = { moduleId: location.moduleId, lessonId: location.lessonId, activityId: lessonState.returnToActivityId };
  next.lessonProgress[lesson.id].returnToActivityId = undefined;
  next.lessonProgress[lesson.id].remediationPathId = undefined;
  next.lessonProgress[lesson.id].mastery = "needs-review";
  next.lessonProgress[lesson.id].masteryState = "needs-review";
  next.lessonProgress[lesson.id].masteryEvidence = "none";
  next.updatedAt = now();
  return next;
}

export function courseValidation(course: Course): CourseValidationIssue[] {
  const issues: CourseValidationIssue[] = [];
  const ids = new Set<string>();
  const add = (id: string, path: string, message: string) => { if (ids.has(id)) issues.push({ code: "duplicate-id", path, message }); else ids.add(id); };
  add(course.id, "course.id", "Course ID must be unique.");
  if (!course.version.trim()) issues.push({ code: "missing-version", path: "course.version", message: "Course version is required." });
  const moduleIds = new Set<string>();
  for (const module of course.modules) {
    if (moduleIds.has(module.id)) issues.push({ code: "duplicate-module", path: module.id, message: "Module ID is duplicated." });
    moduleIds.add(module.id); add(module.id, `modules.${module.id}`, "Module ID must be unique.");
    for (const prerequisite of module.prerequisiteModuleIds) if (!course.modules.some(item => item.id === prerequisite)) issues.push({ code: "missing-prerequisite", path: module.id, message: `Missing prerequisite module ${prerequisite}.` });
    const lessonIds = new Set<string>();
    for (const lesson of module.lessons) {
      if (lessonIds.has(lesson.id)) issues.push({ code: "duplicate-lesson", path: lesson.id, message: "Lesson ID is duplicated in module." });
      lessonIds.add(lesson.id); add(lesson.id, `modules.${module.id}.lessons.${lesson.id}`, "Lesson ID must be unique.");
      if (!lesson.activities.length) issues.push({ code: "empty-lesson", path: lesson.id, message: "Lesson must contain activities." });
      const activityIds = new Set<string>();
      for (const activity of lesson.activities) {
        if (activityIds.has(activity.id)) issues.push({ code: "duplicate-activity", path: activity.id, message: "Activity ID is duplicated in lesson." });
        activityIds.add(activity.id); add(activity.id, `lessons.${lesson.id}.activities.${activity.id}`, "Activity ID must be unique.");
      }
      if (!activityIds.has(lesson.masteryRule.gateActivityId)) issues.push({ code: "missing-mastery-gate", path: lesson.id, message: "Mastery gate does not reference an activity." });
      if (!activityIds.has(lesson.remediationActivityId)) issues.push({ code: "missing-remediation", path: lesson.id, message: "Remediation activity does not exist." });
      for (const required of lesson.masteryRule.requiredActivityIds) if (!activityIds.has(required)) issues.push({ code: "missing-required-activity", path: lesson.id, message: `Required activity ${required} does not exist.` });
      for (const prerequisite of lesson.prerequisiteLessonIds ?? []) if (!course.modules.some(item => item.lessons.some(candidate => candidate.id === prerequisite))) issues.push({ code: "missing-prerequisite-lesson", path: lesson.id, message: `Missing prerequisite lesson ${prerequisite}.` });
      if (!lesson.conceptIds?.length) issues.push({ code: "missing-concept", path: lesson.id, message: "Lesson must declare at least one concept." });
      const guided = lesson.activities.find(activity => activity.type === "guided_practice");
      const transfer = lesson.activities.find(activity => "pedagogicalRole" in activity && activity.pedagogicalRole === "transfer");
      if (guided && transfer && "prompt" in guided && "prompt" in transfer && typeof guided.prompt === "string" && typeof transfer.prompt === "string") {
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const guidedPrompt = normalize(guided.prompt);
        const transferPrompt = normalize(transfer.prompt);
        if (guidedPrompt === transferPrompt || transferPrompt.includes(guidedPrompt) || guidedPrompt.includes(transferPrompt)) issues.push({ code: "duplicate-guided-transfer", path: lesson.id, message: "Independent transfer contains the full guided prompt." });
        if (!("authoredContentId" in transfer) || !transfer.authoredContentId?.endsWith(".transfer")) issues.push({ code: "unauthored-transfer", path: lesson.id, message: "Independent transfer must reference an authored transfer task." });
        if ("context" in guided && "context" in transfer && guided.context === transfer.context) issues.push({ code: "same-transfer-scenario", path: lesson.id, message: "Guided and transfer scenarios must differ." });
        if (/Transfer the lesson to this context:/i.test(transfer.prompt)) issues.push({ code: "generated-transfer-wrapper", path: lesson.id, message: "Transfer uses a generated wrapper pattern." });
      }
      for (const activity of lesson.activities) {
        if (["guided_practice", "scenario", "code_review", "debugging_lab", "incident_lab", "system_design", "architecture_defense", "performance_defense", "security", "interview_drill"].includes(activity.type) && "responseRequired" in activity && !activity.responseRequired) issues.push({ code: "practice-without-response", path: activity.id, message: "Practice activity must capture a learner response." });
        if (activity.type === "mastery_check" || activity.type === "module_assessment" || activity.type === "capstone_activity") {
          if (!activity.rubric?.requiredConcepts.length) issues.push({ code: "missing-mastery-rubric", path: activity.id, message: "Mastery activity needs an authored rubric." });
          if (!activity.conceptIds?.length) issues.push({ code: "missing-mastery-concepts", path: activity.id, message: "Mastery activity needs concept IDs." });
        }
        if ((activity.type === "instruction" || activity.type === "concept_explanation" || activity.type === "worked_example") && !activity.blocks?.length) issues.push({ code: "missing-instruction-blocks", path: activity.id, message: "Rich teaching activity needs typed instructional blocks." });
      }
      const remediation = lesson.activities.find(activity => activity.type === "remediation");
      if (remediation?.type === "remediation" && !remediation.blocks?.length) issues.push({ code: "missing-remediation-blocks", path: remediation.id, message: "Remediation needs a distinct teaching structure." });
    }
  }
  for (const module of course.modules) {
    if (module.moduleAssessment) {
      const assessment = module.moduleAssessment;
      const gate = assessment.activityIds.map(id => allLessons(course).flatMap(({ lesson }) => lesson.activities).find(activity => activity.id === id)).find(Boolean);
      if (!gate || gate.type !== "module_assessment") issues.push({ code: "missing-module-assessment-runtime", path: module.id, message: "Module assessment must point to a runtime module-assessment activity." });
      if ((assessment.conceptIds?.length ?? 0) < 2) issues.push({ code: "shallow-module-assessment", path: module.id, message: "Module assessment must integrate more than one lesson concept." });
      const rubricIds = assessment.rubric?.requiredConcepts.map(item => item.id) ?? [];
      if (rubricIds.join("|") !== (assessment.conceptIds ?? []).join("|")) issues.push({ code: "module-assessment-concept-mismatch", path: module.id, message: "Module assessment concept IDs must match its authored rubric." });
      if (!assessment.description.includes("Unfamiliar integrated scenario")) issues.push({ code: "module-assessment-no-scenario", path: module.id, message: "Module assessment must present an integrated scenario." });
    }
  }
  const capstoneActivities = allLessons(course).flatMap(({ lesson }) => lesson.activities).filter(activity => course.capstone.activityIds.includes(activity.id));
  const stageRubricSignatures = (course.capstone.stages ?? []).map(stage => stage.rubric.requiredConcepts.map(item => item.id).join("|"));
  if (!course.capstone.novelScenario || (course.capstone.stages?.length ?? 0) < 3 || capstoneActivities.some(activity => activity.type !== "capstone_activity") || new Set(stageRubricSignatures).size !== stageRubricSignatures.length || !course.finalAssessment.finalIntegration) issues.push({ code: "invalid-capstone", path: "course.capstone", message: "Capstone needs a novel scenario, distinct sequential stage rubrics, a dedicated activity, and a final integration assessment." });
  return issues;
}

export function courseSummary(course: Course, progress: CourseProgress) {
  const lessons = allLessons(course).map(({ lesson }) => lesson);
  const completedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.mastery === "mastered").length;
  const selfAssessedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "self-assessed").length;
  const verifiedLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "verified").length;
  const needsReviewLessons = lessons.filter(lesson => progress.lessonProgress[lesson.id]?.masteryState === "needs-review").length;
  const activities = lessons.flatMap(lesson => lesson.activities);
  const completedActivities = lessons.reduce((count, lesson) => count + (progress.lessonProgress[lesson.id]?.completedActivityIds.length ?? 0), 0);
  return { lessons: lessons.length, completedLessons, selfAssessedLessons, verifiedLessons, needsReviewLessons, activities: activities.length, completedActivities, modules: course.modules.length, completedModules: course.modules.filter(module => progress.moduleProgress[module.id]?.completionState === "completed").length, selfAssessedModules: course.modules.filter(module => progress.moduleProgress[module.id]?.masteryState === "self-assessed").length, verifiedModules: course.modules.filter(module => progress.moduleProgress[module.id]?.masteryState === "verified").length, needsReviewModules: course.modules.filter(module => progress.moduleProgress[module.id]?.masteryState === "needs-review").length, percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0 };
}

export function activityIsGate(activity: CourseActivity): boolean {
  return activity.type === "mastery_check" || activity.type === "module_assessment" || activity.type === "capstone_activity";
}

export function masteryFor(progress: CourseProgress, lessonId: string): MasteryState {
  return progress.lessonProgress[lessonId]?.mastery ?? "not-started";
}

export function loadCourseProgress(course: Course): CourseProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(`${COURSE_PROGRESS_KEY}:${course.id}`) || "null") as { payload?: unknown; schemaVersion?: number } | null;
    return sanitizeCourseProgress(raw?.schemaVersion === 1 && raw.payload ? raw.payload : raw, course);
  } catch {
    return createCourseProgress(course);
  }
}

export function saveCourseProgress(progress: CourseProgress): void {
  try {
    localStorage.setItem(`${COURSE_PROGRESS_KEY}:${progress.courseId}`, JSON.stringify({
      schemaVersion: 1,
      courseId: progress.courseId,
      courseVersion: progress.courseVersion,
      contentVersion: progress.contentVersion,
      savedAt: now(),
      payload: progress,
    }));
  } catch { /* synchronous compatibility helper is best effort */ }
}

export interface CourseProgressLoad {
  progress: CourseProgress;
  recovered: boolean;
}

/** Async boundary used by the UI so browser and Tauri persistence share one contract. */
export async function loadCourseProgressAsync(course: Course): Promise<CourseProgressLoad> {
  const loaded = await learnerStateStore().load<CourseProgress>(`${COURSE_PROGRESS_KEY}:${course.id}`);
  if (!loaded.payload && isNativeLearnerStateStore()) {
    const legacy = readLegacyBrowserProgress(course);
    if (legacy) {
      await saveCourseProgressAsync(course, legacy);
      return { progress: legacy, recovered: false };
    }
  }
  return {
    progress: loaded.payload ? sanitizeCourseProgress(loaded.payload, course) : createCourseProgress(course),
    recovered: loaded.recovered,
  };
}

function readLegacyBrowserProgress(course: Course): CourseProgress | null {
  try {
    const raw = localStorage.getItem(`${COURSE_PROGRESS_KEY}:${course.id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { schemaVersion?: number; payload?: unknown } | unknown;
    const payload = parsed && typeof parsed === "object" && (parsed as { schemaVersion?: number }).schemaVersion === 1 ? (parsed as { payload?: unknown }).payload : parsed;
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Partial<CourseProgress>;
    if (candidate.courseId !== course.id || candidate.courseVersion !== course.version) return null;
    return sanitizeCourseProgress(payload, course);
  } catch {
    return null;
  }
}

function addReviewItem(progress: CourseProgress, item: CourseProgress["reviewQueue"][number]): void {
  const key = `${item.lessonId}::${item.activityId}::${item.reason}`;
  const existing = progress.reviewQueue.findIndex(candidate => `${candidate.lessonId}::${candidate.activityId}::${candidate.reason}` === key);
  if (existing >= 0) progress.reviewQueue.splice(existing, 1);
  progress.reviewQueue.unshift(item);
  progress.reviewQueue = progress.reviewQueue.slice(0, 100);
}

function clearResolvedReviewItems(progress: CourseProgress, location: CourseLocation): void {
  progress.reviewQueue = progress.reviewQueue.filter(item => !(item.lessonId === location.lessonId && item.activityId === location.activityId));
}

let pendingProgressSave: Promise<void> = Promise.resolve();

export async function saveCourseProgressAsync(course: Course, progress: CourseProgress): Promise<void> {
  const write = pendingProgressSave.catch(() => undefined).then(() => learnerStateStore().save(`${COURSE_PROGRESS_KEY}:${course.id}`, {
    courseId: course.id,
    courseVersion: course.version,
    contentVersion: course.contentVersion,
  }, progress));
  pendingProgressSave = write.catch(() => undefined);
  await write;
}

export async function resetCourseProgressAsync(course: Course): Promise<void> {
  await learnerStateStore().remove(`${COURSE_PROGRESS_KEY}:${course.id}`);
}

export function serializeCourseProgress(course: Course, progress: CourseProgress): string {
  return JSON.stringify({
    schemaVersion: 1,
    courseId: course.id,
    courseVersion: course.version,
    contentVersion: course.contentVersion,
    savedAt: now(),
    payload: progress,
  }, null, 2);
}

export async function importCourseProgressAsync(course: Course, raw: string): Promise<CourseProgress> {
  if (raw.length > MAX_COURSE_CHECKPOINT_CHARS) throw new Error("That class checkpoint is too large to import safely.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("That class checkpoint is not valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("That class checkpoint must be a JSON object.");
  const value = parsed as { schemaVersion?: unknown; courseId?: unknown; courseVersion?: unknown; payload?: unknown };
  const payload = value.schemaVersion === 1 ? value.payload : parsed;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("That class checkpoint has an invalid payload.");
  const payloadRecord = payload as { courseId?: unknown; courseVersion?: unknown; current?: unknown; lessonProgress?: unknown; moduleProgress?: unknown; reviewQueue?: unknown; sessions?: unknown; weaknessTags?: unknown };
  const courseId = value.schemaVersion === 1 ? value.courseId : payloadRecord.courseId;
  const courseVersion = value.schemaVersion === 1 ? value.courseVersion : payloadRecord.courseVersion;
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1) throw new Error("This class checkpoint version is not supported.");
  if (courseId !== course.id || courseVersion !== course.version) throw new Error("This checkpoint belongs to a different course version.");
  if (!validLocation(course, payloadRecord.current) || !payloadRecord.lessonProgress || typeof payloadRecord.lessonProgress !== "object" || Array.isArray(payloadRecord.lessonProgress) || !payloadRecord.moduleProgress || typeof payloadRecord.moduleProgress !== "object" || Array.isArray(payloadRecord.moduleProgress) || (payloadRecord.reviewQueue !== undefined && !Array.isArray(payloadRecord.reviewQueue)) || (payloadRecord.sessions !== undefined && !Array.isArray(payloadRecord.sessions)) || (payloadRecord.weaknessTags !== undefined && !Array.isArray(payloadRecord.weaknessTags))) throw new Error("That class checkpoint has invalid state fields.");
  const progress = sanitizeCourseProgress(payload, course);
  await saveCourseProgressAsync(course, progress);
  return progress;
}
