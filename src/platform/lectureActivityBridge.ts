import type { CourseActivity, CourseLocation } from "../course/types";
import { advanceAfterFormalActivity } from "../lecture/runtime";
import { isFormalLectureSegment, type LectureDefinition, type LectureRunState, type LectureSegment } from "../lecture/types";
import { applyAuthoredActivityResponse, evaluateAuthoredActivityResponse, type CourseProgress, type CourseRuntimeContext } from "./runtime";

export const LECTURE_ACTIVITY_RESOLUTION_ERROR = "This lecture activity could not be resolved.";

export interface ResolvedLectureActivity {
  activity: CourseActivity;
  location: CourseLocation;
}

export interface AppliedLectureActivity {
  resolved: ResolvedLectureActivity;
  outcome: ReturnType<typeof evaluateAuthoredActivityResponse>;
  progress: CourseProgress;
  run: LectureRunState;
}

/**
 * Resolve only the exact authored activity named by both formal-segment fields.
 * A lecture cannot invent a replacement activity when its source tuple is bad.
 */
export function resolveLectureActivity(context: CourseRuntimeContext, segment: LectureSegment): ResolvedLectureActivity | undefined {
  if (!isFormalLectureSegment(segment) || !segment.sourceActivityId || !segment.sourceLocation) return undefined;
  const { moduleId, lessonId, activityId } = segment.sourceLocation;
  if (!moduleId || !lessonId || !activityId || activityId !== segment.sourceActivityId) return undefined;
  const module = context.course.modules.find(item => item.id === moduleId);
  const lesson = module?.lessons.find(item => item.id === lessonId);
  const activity = lesson?.activities.find(item => item.id === segment.sourceActivityId);
  if (!activity) return undefined;
  return { activity, location: { moduleId, lessonId, activityId } };
}

/**
 * Apply a formal lecture response through the same evaluator and progress
 * mutation used by Classroom, then derive the next lecture cursor from that
 * authoritative result.
 */
export function applyLectureActivityResponse(
  context: CourseRuntimeContext,
  progress: CourseProgress,
  lecture: LectureDefinition,
  run: LectureRunState,
  segment: LectureSegment,
  response: string
): AppliedLectureActivity | undefined {
  const resolved = resolveLectureActivity(context, segment);
  if (!resolved) return undefined;
  const stage = resolved.activity.type === "capstone_activity" ? progress.capstone?.currentStage ?? 1 : undefined;
  const outcome = evaluateAuthoredActivityResponse(context, resolved.location, response, stage);
  const nextProgress = applyAuthoredActivityResponse(context, progress, resolved.location, response, stage);
  return {
    resolved,
    outcome,
    progress: nextProgress,
    run: advanceAfterFormalActivity(lecture, run, nextProgress, resolved.location, outcome.passed)
  };
}
