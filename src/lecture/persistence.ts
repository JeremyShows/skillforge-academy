import type { ClassSessionPlan } from "../classroom/types";
import type { CourseLocation, CourseProgress } from "../course/types";
import { buildLectureCatalog, lectureForLesson } from "./catalog";
import { createLectureRunState, createMigratedLectureRunState } from "./runtime";
import type { LectureCatalog, LectureDeliveryState, LectureDefinition, LectureNote, LectureResponse, LectureRunState } from "./types";

const MAX_SEGMENTS = 160;
const MAX_RESPONSES = 160;
const MAX_NOTES = 160;
const MAX_BOOKMARKS = 160;
const MAX_TEXT = 4000;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function text(value: unknown, max = MAX_TEXT): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= max ? value : undefined;
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function lectureById(catalog: LectureCatalog, value: unknown): LectureDefinition | undefined {
  return typeof value === "string" ? catalog.lectures.find(lecture => lecture.id === value) : undefined;
}

function sanitizeRun(lecture: LectureDefinition, value: unknown, startedAt: string): LectureRunState {
  const raw = record(value) ? value : {};
  const validIds = new Set(lecture.segments.map(segment => segment.id));
  const currentSegmentId = typeof raw.currentSegmentId === "string" && validIds.has(raw.currentSegmentId) ? raw.currentSegmentId : lecture.segments[0].id;
  const reviewSegmentId = typeof raw.reviewSegmentId === "string" && validIds.has(raw.reviewSegmentId) ? raw.reviewSegmentId : undefined;
  const migratedPastSegmentIds = Array.isArray(raw.migratedPastSegmentIds) ? [...new Set(raw.migratedPastSegmentIds.filter(item => typeof item === "string" && validIds.has(item)).slice(0, MAX_SEGMENTS))] as string[] : [];
  const visitedSegmentIds = Array.isArray(raw.visitedSegmentIds) ? [...new Set(raw.visitedSegmentIds.filter(item => typeof item === "string" && validIds.has(item)).slice(0, MAX_SEGMENTS))] as string[] : [];
  const responses: LectureResponse[] = Array.isArray(raw.responses) ? raw.responses.map(item => {
    if (!record(item) || typeof item.segmentId !== "string" || !validIds.has(item.segmentId) || !timestamp(item.answeredAt) || !["prediction", "socratic", "question"].includes(String(item.kind))) return undefined;
    const response = text(item.text);
    return response ? { segmentId: item.segmentId, text: response, answeredAt: item.answeredAt as string, kind: item.kind as LectureResponse["kind"] } : undefined;
  }).filter((item): item is LectureResponse => Boolean(item)).slice(0, MAX_RESPONSES) : [];
  const notes: LectureNote[] = Array.isArray(raw.notes) ? raw.notes.map(item => {
    if (!record(item) || typeof item.id !== "string" || typeof item.segmentId !== "string" || !validIds.has(item.segmentId) || !timestamp(item.createdAt) || !timestamp(item.updatedAt)) return undefined;
    const noteText = text(item.text);
    return noteText ? { id: item.id.slice(0, 180), segmentId: item.segmentId, text: noteText, createdAt: item.createdAt as string, updatedAt: item.updatedAt as string } : undefined;
  }).filter((item): item is LectureNote => Boolean(item)).slice(0, MAX_NOTES) : [];
  const bookmarks = Array.isArray(raw.bookmarks) ? raw.bookmarks.map(item => record(item) && typeof item.segmentId === "string" && validIds.has(item.segmentId) && timestamp(item.createdAt) ? { segmentId: item.segmentId, createdAt: item.createdAt as string } : undefined).filter((item): item is { segmentId: string; createdAt: string } => Boolean(item)).slice(0, MAX_BOOKMARKS) : [];
  const safeStartedAt = timestamp(raw.startedAt) ? raw.startedAt : startedAt;
  return { lectureId: lecture.id, lectureVersion: lecture.version, currentSegmentId, reviewSegmentId, migratedPastSegmentIds, visitedSegmentIds, responses, notes, bookmarks, startedAt: safeStartedAt, completedAt: timestamp(raw.completedAt) ? raw.completedAt : undefined };
}

export function lectureForPlan(catalog: LectureCatalog, plan: ClassSessionPlan): LectureDefinition | undefined {
  const lessonId = plan.lessonIds[0];
  return lessonId ? lectureForLesson(catalog, lessonId) : undefined;
}

export function createLectureDelivery(catalog: LectureCatalog, plan: ClassSessionPlan, progress?: CourseProgress, now = new Date().toISOString()): LectureDeliveryState | undefined {
  const lecture = lectureForPlan(catalog, plan);
  if (!lecture) return undefined;
  void progress;
  const run = createLectureRunState(lecture, now);
  return { kind: "lecture", lectureId: lecture.id, lectureVersion: lecture.version, run };
}

export function createMigratedLectureDelivery(catalog: LectureCatalog, plan: ClassSessionPlan, progress: CourseProgress, now = new Date().toISOString()): LectureDeliveryState | undefined {
  const lecture = lectureForPlan(catalog, plan);
  if (!lecture) return undefined;
  return { kind: "lecture", lectureId: lecture.id, lectureVersion: lecture.version, run: createMigratedLectureRunState(lecture, progress, now) };
}

export function sanitizeLectureDelivery(catalog: LectureCatalog, raw: unknown, fallback: LectureDeliveryState | undefined, startedAt: string): LectureDeliveryState | undefined {
  const fallbackLecture = fallback ? catalog.lectures.find(lecture => lecture.id === fallback.lectureId) : undefined;
  const rawRecord = record(raw) ? raw : {};
  const lecture = lectureById(catalog, rawRecord.lectureId) ?? fallbackLecture;
  if (!lecture) return fallback;
  const runValue = rawRecord.run ?? fallback?.run;
  const run = sanitizeRun(lecture, runValue, startedAt);
  return { kind: "lecture", lectureId: lecture.id, lectureVersion: lecture.version, run };
}

export function lectureCatalogForCourse(course: Parameters<typeof buildLectureCatalog>[0]): LectureCatalog {
  return buildLectureCatalog(course);
}

export function isLectureRunState(value: unknown): value is LectureRunState {
  return record(value) && typeof value.lectureId === "string" && typeof value.lectureVersion === "string" && typeof value.currentSegmentId === "string" && Array.isArray(value.visitedSegmentIds);
}

export function locationForLectureSegment(catalog: LectureCatalog, delivery: LectureDeliveryState | undefined): CourseLocation | undefined {
  const lecture = delivery ? catalog.lectures.find(item => item.id === delivery.lectureId) : undefined;
  return lecture?.segments.find(segment => segment.id === delivery?.run.currentSegmentId)?.sourceLocation;
}


