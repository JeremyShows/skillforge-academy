import type { Course, CourseActivity, CourseLocation, CourseProgress } from "../course/types";
import { allLessons, firstLocation, resolveResumePoint } from "../course/progress";
import type { ClassAgendaSegment, ClassroomSegmentKind, ClassSessionPlan, ClassroomState } from "./types";

export const CLASS_BUDGET_MINUTES = 52;

export function activitySegmentKind(activity: CourseActivity): ClassroomSegmentKind {
  if (activity.type === "instruction" || activity.type === "concept_explanation") return "TEACH";
  if (activity.type === "worked_example") return "DEMONSTRATION";
  if (activity.type === "guided_practice") return "GUIDED_PRACTICE";
  if (activity.type === "mastery_check" || activity.type === "module_assessment" || activity.type === "capstone_activity") return "ASSESSMENT";
  if (activity.type === "remediation") return "REMEDIATION";
  if (["knowledge_check", "no_notes", "retrieval_practice", "explain_back", "reflective_prompt"].includes(activity.type)) return "RECAP";
  if (activity.type === "interview_drill") return "TEACHER_CHECK";
  return "INDEPENDENT_PRACTICE";
}

function activityTitle(activity: CourseActivity, kind: ClassroomSegmentKind): string {
  const labels: Partial<Record<ClassroomSegmentKind, string>> = { TEACH: "Teaching", DEMONSTRATION: "Worked demonstration", GUIDED_PRACTICE: "Guided practice", ASSESSMENT: "Assessment", REMEDIATION: "Remediation", RECAP: "Retrieval / recap", TEACHER_CHECK: "Teacher check", INDEPENDENT_PRACTICE: "Independent transfer" };
  return `${labels[kind] ?? kind}: ${activity.title}`;
}

function locationFor(moduleId: string, lessonId: string, activityId: string): CourseLocation { return { moduleId, lessonId, activityId }; }

function addActivity(agenda: ClassAgendaSegment[], course: Course, moduleId: string, lessonId: string, activity: CourseActivity, required: boolean): void {
  const kind = activitySegmentKind(activity);
  agenda.push({ id: `segment:${lessonId}:${activity.id}`, kind, title: activityTitle(activity, kind), estimatedMinutes: Math.max(1, activity.estimatedMinutes), required, lessonId, activityId: activity.id, location: locationFor(moduleId, lessonId, activity.id) });
}

export function agendaSegmentForActivity(course: Course, location: CourseLocation, required = true): ClassAgendaSegment | undefined {
  const module = course.modules.find(item => item.id === location.moduleId);
  const lesson = module?.lessons.find(item => item.id === location.lessonId);
  const activity = lesson?.activities.find(item => item.id === location.activityId);
  if (!module || !lesson || !activity) return undefined;
  const agenda: ClassAgendaSegment[] = [];
  addActivity(agenda, course, module.id, lesson.id, activity, required);
  return agenda[0];
}

export function classPlanSignature(course: Course, progress: CourseProgress): string {
  const resume = resolveResumePoint(course, progress);
  const review = progress.reviewQueue.filter(item => item.lessonId === resume.lessonId).slice(0, 3).map(item => item.id).join(",");
  return `${course.id}:${resume.moduleId}:${resume.lessonId}:${resume.activityId}:${review}`;
}

export function planClassSession(course: Course, progress: CourseProgress, classroom: ClassroomState, now = new Date().toISOString()): ClassSessionPlan {
  const resume = progress.completedAt ? firstLocation(course) : currentOrResumePoint(course, progress);
  const module = course.modules.find(item => item.id === resume.moduleId) ?? course.modules[0];
  const lesson = module.lessons.find(item => item.id === resume.lessonId) ?? module.lessons[0];
  const currentIndex = Math.max(0, lesson.activities.findIndex(activity => activity.id === resume.activityId));
  const agenda: ClassAgendaSegment[] = [{ id: `opening:${lesson.id}`, kind: "OPENING", title: "Teacher opening", estimatedMinutes: 3, required: true }];
  const previousLesson = allLessons(course).map(item => item.lesson).find((item, index, lessons) => lessons[index + 1]?.id === lesson.id);
  if (previousLesson || progress.reviewQueue.length > 0) agenda.push({ id: `recap:${lesson.id}`, kind: "RECAP", title: "Retrieval / recap", estimatedMinutes: 5, required: false, lessonId: previousLesson?.id ?? lesson.id });
  const reviewForLesson = progress.reviewQueue.filter(item => item.lessonId === lesson.id && progress.lessonProgress[item.lessonId]?.masteryState === "needs-review").slice(0, 2);
  const candidates = reviewForLesson.length > 0
    ? reviewForLesson.map(item => lesson.activities.find(activity => activity.id === item.activityId)).filter((activity): activity is CourseActivity => Boolean(activity))
    : lesson.activities.slice(currentIndex);
  let minutes = agenda.reduce((sum, segment) => sum + segment.estimatedMinutes, 0);
  for (const activity of candidates) {
    if (agenda.some(segment => segment.activityId === activity.id)) continue;
    const required = activity.required !== false;
    if (minutes + activity.estimatedMinutes + 4 > CLASS_BUDGET_MINUTES && agenda.some(segment => segment.activityId)) break;
    addActivity(agenda, course, module.id, lesson.id, activity, required);
    minutes += Math.max(1, activity.estimatedMinutes);
  }
  if (!agenda.some(segment => segment.activityId === resume.activityId)) {
    const activity = lesson.activities.find(item => item.id === resume.activityId) ?? lesson.activities[0];
    addActivity(agenda, course, module.id, lesson.id, activity, activity.required !== false);
    minutes += Math.max(1, activity.estimatedMinutes);
  }
  agenda.push({ id: `closing:${lesson.id}`, kind: "CLOSING", title: "Closing summary / next study", estimatedMinutes: 4, required: true });
  const previous = Object.values(classroom.classRecords).filter(record => record.courseId === course.id).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))[0];
  const prior = previous?.summary?.title ? ` Last class was ${previous.summary.title}.` : "";
  return {
    id: `class-plan:${classPlanSignature(course, progress)}`,
    courseId: course.id,
    moduleId: module.id,
    lessonIds: [lesson.id],
    title: progress.completedAt ? `Review course: ${lesson.title}` : lesson.title,
    learningObjectives: lesson.objectives.slice(0, 4),
    agenda,
    estimatedMinutes: minutes,
    openingBrief: `${prior} Today we will work on ${lesson.title}. Keep this objective in view: ${lesson.objectives[0] ?? lesson.summary}`.trim(),
    closingPolicy: "Close with actual attempted activity evidence, authored academic status, needs-review concepts, and the next deterministic resume point.",
    createdAt: now,
  };
}

export function firstActivityLocation(plan: ClassSessionPlan): CourseLocation | undefined {
  return plan.agenda.find(segment => Boolean(segment.location))?.location;
}

function locationKey(location: CourseLocation): string {
  return `${location.moduleId}:${location.lessonId}:${location.activityId}`;
}

function currentOrResumePoint(course: Course, progress: CourseProgress): CourseLocation {
  const module = course.modules.find(item => item.id === progress.current.moduleId);
  const lesson = module?.lessons.find(item => item.id === progress.current.lessonId);
  const activity = lesson?.activities.find(item => item.id === progress.current.activityId);
  if (activity && !activitySatisfied(progress, progress.current)) return progress.current;
  return resolveResumePoint(course, progress);
}

function activitySatisfied(progress: CourseProgress, location: CourseLocation): boolean {
  return progress.lessonProgress[location.lessonId]?.completedActivityIds.includes(location.activityId) ?? false;
}

export function reconcilePlanWithProgress(course: Course, plan: ClassSessionPlan, progress: CourseProgress, now = new Date().toISOString()): ClassSessionPlan {
  if (progress.completedAt) return plan;
  const current = currentOrResumePoint(course, progress);
  const currentKey = locationKey(current);
  let agenda = plan.agenda.filter(segment => !segment.location || !activitySatisfied(progress, segment.location));
  const hasCurrent = agenda.some(segment => segment.location && locationKey(segment.location) === currentKey);
  if (!hasCurrent) {
    const dynamic = agendaSegmentForActivity(course, current, true);
    if (dynamic) {
      const closingIndex = agenda.findIndex(segment => segment.kind === "CLOSING");
      agenda = [...agenda.slice(0, closingIndex < 0 ? agenda.length : closingIndex), dynamic, ...agenda.slice(closingIndex < 0 ? agenda.length : closingIndex)];
    }
  }
  const active = agenda.some(segment => segment.location && locationKey(segment.location) === currentKey);
  if (!active) return { ...plan, agenda, createdAt: now };
  return { ...plan, agenda, createdAt: plan.createdAt };
}

export function activeSegmentForProgress(course: Course, plan: ClassSessionPlan, progress: CourseProgress): ClassAgendaSegment | undefined {
  if (progress.completedAt) return undefined;
  const current = currentOrResumePoint(course, progress);
  const currentKey = locationKey(current);
  return plan.agenda.find(segment => segment.location && locationKey(segment.location) === currentKey && !activitySatisfied(progress, segment.location))
    ?? plan.agenda.find(segment => segment.location && !activitySatisfied(progress, segment.location) && isPrerequisiteSatisfied(course, progress, segment.location));
}

export function segmentForActivity(plan: ClassSessionPlan, activityId: string): ClassAgendaSegment | undefined {
  return plan.agenda.find(segment => segment.activityId === activityId);
}

export function isPrerequisiteSatisfied(course: Course, progress: CourseProgress, location: CourseLocation): boolean {
  const module = course.modules.find(item => item.id === location.moduleId);
  const lesson = module?.lessons.find(item => item.id === location.lessonId);
  if (!module || !lesson) return false;
  return module.prerequisiteModuleIds.every(id => progress.moduleProgress[id]?.completionState === "completed") &&
    (lesson.prerequisiteLessonIds ?? []).every(id => progress.lessonProgress[id]?.completionState === "completed");
}


