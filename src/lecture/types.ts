import type { CourseLocation } from "../course/types";

/** Delivery content has its own revision line; it is not course mastery content. */
export const LECTURE_CATALOG_VERSION = "2026-10-04.1";
export const DEFAULT_LECTURE_VERSION = "1.0.0";

export type LectureSegmentType =
  | "OPENING"
  | "LECTURE"
  | "EXPLANATION"
  | "DIAGRAM"
  | "WORKED_TRACE"
  | "CODE_WALKTHROUGH"
  | "DEMONSTRATION"
  | "PAUSE_AND_PREDICT"
  | "SOCRATIC_QUESTION"
  | "KNOWLEDGE_CHECK"
  | "GUIDED_PRACTICE"
  | "INDEPENDENT_PRACTICE"
  | "ASSESSMENT"
  | "REMEDIATION"
  | "RECAP"
  | "CLOSING";

export type LectureExpectedInteraction = "none" | "free-response" | "prediction" | "question";

export type LectureAuthoredContent =
  | { kind: "prose"; paragraphs: string[] }
  | { kind: "diagram"; label: string; nodes: string[]; edges: string[]; textEquivalent: string }
  | { kind: "trace"; steps: string[]; textEquivalent: string }
  | { kind: "code"; language: string; code: string; annotations: string[]; textEquivalent: string };

export interface LectureSegment {
  id: string;
  type: LectureSegmentType;
  title: string;
  conceptIds: string[];
  authoredContent?: LectureAuthoredContent;
  teacherCue?: string;
  sourceActivityId?: string;
  sourceLocation?: CourseLocation;
  prompt?: string;
  expectedInteraction?: LectureExpectedInteraction;
  references?: string[];
  estimatedMinutes: number;
  required: boolean;
}

export interface LectureDefinition {
  id: string;
  version: string;
  courseId: string;
  moduleId: string;
  lessonIds: string[];
  number?: number;
  title: string;
  abstract: string;
  objectives: string[];
  prerequisiteConceptIds: string[];
  estimatedMinutes: number;
  segments: LectureSegment[];
  references: string[];
  tags: string[];
  explicit: boolean;
}

export interface LectureCatalog {
  courseId: string;
  version: string;
  lectures: LectureDefinition[];
  explicitLectureIds: string[];
}

export interface LectureResponse {
  segmentId: string;
  text: string;
  answeredAt: string;
  kind: "prediction" | "socratic" | "question";
}

export interface LectureNote {
  id: string;
  segmentId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface LectureBookmark {
  segmentId: string;
  createdAt: string;
}

export interface LectureRunState {
  lectureId: string;
  lectureVersion: string;
  currentSegmentId: string;
  /** Optional display-only historical review target; never the required cursor. */
  reviewSegmentId?: string;
  visitedSegmentIds: string[];
  /** Delivery-only predecessors skipped during truthful legacy migration. */
  migratedPastSegmentIds?: string[];
  responses: LectureResponse[];
  notes: LectureNote[];
  bookmarks: LectureBookmark[];
  startedAt: string;
  completedAt?: string;
}

export interface LectureDeliveryState {
  kind: "lecture";
  lectureId: string;
  lectureVersion: string;
  run: LectureRunState;
}

export function isInformationalLectureSegment(segment: LectureSegment): boolean {
  return ["OPENING", "LECTURE", "EXPLANATION", "DIAGRAM", "WORKED_TRACE", "CODE_WALKTHROUGH", "DEMONSTRATION", "RECAP", "CLOSING"].includes(segment.type);
}

export function isInteractiveLectureSegment(segment: LectureSegment): boolean {
  return ["PAUSE_AND_PREDICT", "SOCRATIC_QUESTION", "KNOWLEDGE_CHECK"].includes(segment.type);
}

export function isFormalLectureSegment(segment: LectureSegment): boolean {
  return ["GUIDED_PRACTICE", "INDEPENDENT_PRACTICE", "ASSESSMENT", "REMEDIATION"].includes(segment.type);
}


