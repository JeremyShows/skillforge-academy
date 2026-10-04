import { activityIsGate } from "../course/progress";
import type { Course, CourseLocation, CourseProgress } from "../course/types";
import { isFormalLectureSegment, isInformationalLectureSegment, isInteractiveLectureSegment, type LectureDefinition, type LectureNote, type LectureResponse, type LectureRunState, type LectureSegment } from "./types";

export function firstLectureSegment(lecture: LectureDefinition): LectureSegment {
  return lecture.segments[0];
}

export function createLectureRunState(lecture: LectureDefinition, now = new Date().toISOString(), _preferredLocation?: CourseLocation): LectureRunState {
  return { lectureId: lecture.id, lectureVersion: lecture.version, currentSegmentId: firstLectureSegment(lecture).id, visitedSegmentIds: [], responses: [], notes: [], bookmarks: [], startedAt: now };
}

/** Build a truthful lecture shell around an already-active pre-lecture class. */
export function createMigratedLectureRunState(lecture: LectureDefinition, progress: CourseProgress, now = new Date().toISOString()): LectureRunState {
  const initial = createLectureRunState(lecture, now);
  const anchor = segmentForLocation(lecture, progress.current);
  if (!anchor) return initial;
  const anchorIndex = lecture.segments.findIndex(segment => segment.id === anchor.id);
  const beforeAnchor = lecture.segments.slice(0, anchorIndex);
  const incompleteBeforeAnchor = beforeAnchor.findIndex(segment => !segmentIsCompleted(segment, initial, progress));
  let targetIndex = incompleteBeforeAnchor >= 0 ? incompleteBeforeAnchor : anchorIndex;
  if (segmentIsCompleted(anchor, initial, progress)) {
    const next = lecture.segments.findIndex((segment, index) => index > anchorIndex && !segmentIsCompleted(segment, initial, progress));
    targetIndex = next >= 0 ? next : lecture.segments.length - 1;
  }
  const migratedPastSegmentIds = lecture.segments.slice(0, targetIndex)
    .filter(segment => !isFormalLectureSegment(segment) || segmentIsCompleted(segment, initial, progress))
    .map(segment => segment.id);
  return { ...initial, currentSegmentId: lecture.segments[targetIndex]?.id ?? lecture.segments[0].id, migratedPastSegmentIds };
}

function sameLocation(left: CourseLocation | undefined, right: CourseLocation | undefined): boolean {
  return Boolean(left && right && left.moduleId === right.moduleId && left.lessonId === right.lessonId && left.activityId === right.activityId);
}

export function currentLectureSegment(lecture: LectureDefinition, run: LectureRunState): LectureSegment {
  return lecture.segments.find(segment => segment.id === run.currentSegmentId) ?? firstLectureSegment(lecture);
}

export function segmentForLocation(lecture: LectureDefinition, location: CourseLocation): LectureSegment | undefined {
  return lecture.segments.find(segment => sameLocation(segment.sourceLocation, location));
}

export function segmentIsCompleted(segment: LectureSegment, run: LectureRunState, progress: CourseProgress): boolean {
  if (run.visitedSegmentIds.includes(segment.id) || run.migratedPastSegmentIds?.includes(segment.id)) return true;
  if (!isFormalLectureSegment(segment) || !segment.sourceLocation || !segment.sourceActivityId) return false;
  return progress.lessonProgress[segment.sourceLocation.lessonId]?.completedActivityIds.includes(segment.sourceActivityId) ?? false;
}

export function nextUnvisitedSegment(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress): LectureSegment | undefined {
  const currentIndex = Math.max(0, lecture.segments.findIndex(segment => segment.id === run.currentSegmentId));
  return lecture.segments.slice(currentIndex + 1).find(segment => !segmentIsCompleted(segment, run, progress));
}

export function reconcileLectureRun(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress): LectureRunState {
  const currentIsValid = lecture.segments.some(segment => segment.id === run.currentSegmentId);
  const safeRun = run.lectureId === lecture.id && run.lectureVersion === lecture.version && currentIsValid ? run : createLectureRunState(lecture, run.startedAt);
  const current = currentLectureSegment(lecture, safeRun);
  if (!segmentIsCompleted(current, safeRun, progress)) return safeRun;
  const next = nextUnvisitedSegment(lecture, safeRun, progress);
  return next ? { ...safeRun, currentSegmentId: next.id } : { ...safeRun, completedAt: safeRun.completedAt ?? new Date().toISOString() };
}

export function advanceLectureSegment(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress, response?: Omit<LectureResponse, "segmentId" | "answeredAt">, now = new Date().toISOString()): LectureRunState {
  const current = currentLectureSegment(lecture, run);
  if (isFormalLectureSegment(current)) return run;
  const responses = response ? [...run.responses.filter(item => item.segmentId !== current.id), { ...response, segmentId: current.id, answeredAt: now }] : run.responses;
  const visitedSegmentIds = run.visitedSegmentIds.includes(current.id) ? run.visitedSegmentIds : [...run.visitedSegmentIds, current.id];
  const next = nextUnvisitedSegment(lecture, { ...run, visitedSegmentIds, responses }, progress);
  return next ? { ...run, visitedSegmentIds, responses, currentSegmentId: next.id } : { ...run, visitedSegmentIds, responses, completedAt: now };
}

export function recordLectureResponse(run: LectureRunState, segmentId: string, response: Omit<LectureResponse, "segmentId" | "answeredAt">, now = new Date().toISOString()): LectureRunState {
  return { ...run, responses: [...run.responses.filter(item => item.segmentId !== segmentId), { ...response, segmentId, answeredAt: now }] };
}

export function advanceAfterFormalActivity(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress, location: CourseLocation, passed: boolean, now = new Date().toISOString()): LectureRunState {
  const current = segmentForLocation(lecture, location) ?? currentLectureSegment(lecture, run);
  if (!passed) {
    const remediation = lecture.segments.find(segment => segment.type === "REMEDIATION" && segment.sourceLocation?.lessonId === location.lessonId);
    return remediation ? { ...run, currentSegmentId: remediation.id } : run;
  }
  const visitedSegmentIds = run.visitedSegmentIds.includes(current.id) ? run.visitedSegmentIds : [...run.visitedSegmentIds, current.id];
  const retryLocation = current.type === "REMEDIATION" ? segmentForLocation(lecture, progress.current) : undefined;
  const next = retryLocation ?? nextUnvisitedSegment(lecture, { ...run, visitedSegmentIds }, progress);
  return next ? { ...run, visitedSegmentIds, currentSegmentId: next.id } : { ...run, visitedSegmentIds, currentSegmentId: lecture.segments[lecture.segments.length - 1].id, completedAt: now };
}

export function addLectureNote(run: LectureRunState, segmentId: string, text: string, now = new Date().toISOString()): LectureRunState {
  const clean = text.trim();
  if (!clean) return run;
  const existing = run.notes.find(note => note.segmentId === segmentId);
  const note: LectureNote = existing ? { ...existing, text: clean, updatedAt: now } : { id: `note:${run.lectureId}:${segmentId}:${Date.now()}`, segmentId, text: clean, createdAt: now, updatedAt: now };
  return { ...run, notes: [...run.notes.filter(item => item.segmentId !== segmentId), note] };
}

export function deleteLectureNote(run: LectureRunState, segmentId: string): LectureRunState {
  return { ...run, notes: run.notes.filter(note => note.segmentId !== segmentId) };
}

export function toggleLectureBookmark(run: LectureRunState, segmentId: string, now = new Date().toISOString()): LectureRunState {
  return run.bookmarks.some(bookmark => bookmark.segmentId === segmentId)
    ? { ...run, bookmarks: run.bookmarks.filter(bookmark => bookmark.segmentId !== segmentId) }
    : { ...run, bookmarks: [...run.bookmarks, { segmentId, createdAt: now }] };
}

export function reviewLectureSegment(lecture: LectureDefinition, run: LectureRunState, segmentId: string, progress: CourseProgress): LectureRunState {
  const segment = lecture.segments.find(item => item.id === segmentId);
  if (!segment || segment.id === run.currentSegmentId || !segmentIsCompleted(segment, run, progress)) return run;
  return { ...run, reviewSegmentId: segment.id };
}

export function clearLectureReview(run: LectureRunState): LectureRunState {
  return run.reviewSegmentId ? { ...run, reviewSegmentId: undefined } : run;
}

export function displayedLectureSegment(lecture: LectureDefinition, run: LectureRunState): LectureSegment {
  return lecture.segments.find(segment => segment.id === run.reviewSegmentId) ?? currentLectureSegment(lecture, run);
}

export function formalAssistanceLocation(course: Course, segment: LectureSegment, reviewOnly = false): CourseLocation | undefined {
  if (reviewOnly || !isFormalLectureSegment(segment) || !segment.sourceLocation || !segment.sourceActivityId) return undefined;
  const activity = course.modules.flatMap(module => module.lessons).find(lesson => lesson.id === segment.sourceLocation?.lessonId)?.activities.find(item => item.id === segment.sourceActivityId);
  return activity && activityIsGate(activity) ? segment.sourceLocation : undefined;
}

export function lectureCanClose(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress): boolean {
  return lecture.segments.filter(segment => segment.required).every(segment => segmentIsCompleted(segment, run, progress));
}

export function lectureCompletionLabel(lecture: LectureDefinition, run: LectureRunState, progress: CourseProgress): string {
  if (lectureCanClose(lecture, run, progress)) return "Lecture complete";
  const completed = lecture.segments.filter(segment => segment.required && segmentIsCompleted(segment, run, progress)).length;
  const total = lecture.segments.filter(segment => segment.required).length;
  return `${completed} of ${total} required segments complete`;
}

export function segmentPresentationKind(segment: LectureSegment): "teaching" | "interaction" | "activity" {
  if (isFormalLectureSegment(segment)) return "activity";
  if (isInteractiveLectureSegment(segment)) return "interaction";
  if (isInformationalLectureSegment(segment)) return "teaching";
  return "teaching";
}


