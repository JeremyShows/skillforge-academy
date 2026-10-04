import type { CourseLocation, CourseProgress, Course } from "../course/types";
import { LECTURE_CATALOG_VERSION, type LectureDeliveryState } from "../lecture/types";
import { emptyAcademicEngagementState, type AcademicEngagementState } from "../academic/types";
import type { LabHistoryEntry, LabRunState } from "../labs/types";

export const CLASSROOM_SCHEMA_VERSION = 5;
export const CLASSROOM_STATE_KEY = "skillforge-classroom-v1";
export const SUPPORTED_ACADEMY_ID = "skillforge-academy";
export const SUPPORTED_PROGRAM_ID = "default-program";

export type EnrollmentStatus = "active" | "paused" | "completed";
export type ClassSessionRecordStatus = "active" | "paused" | "completed";
export type ClassroomSegmentKind = "OPENING" | "RECAP" | "TEACH" | "DEMONSTRATION" | "TEACHER_CHECK" | "GUIDED_PRACTICE" | "INDEPENDENT_PRACTICE" | "ASSESSMENT" | "REMEDIATION" | "CLOSING";

export interface AcademyDefinition {
  id: string;
  title: string;
  description: string;
  accreditationClaim: false;
}

export interface ProgramDefinition {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  status: "alpha" | "roadmap";
}

export interface TeacherProfile {
  id: string;
  displayName: string;
  role: string;
  teachingStyle: string[];
}

export interface CourseEnrollment {
  courseId: string;
  programId: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  currentClassSessionId?: string;
  lastClassSessionId?: string;
  completedAt?: string;
}

export interface ClassAgendaSegment {
  id: string;
  kind: ClassroomSegmentKind;
  title: string;
  estimatedMinutes: number;
  required: boolean;
  lessonId?: string;
  activityId?: string;
  location?: CourseLocation;
}

export interface ClassSessionPlan {
  id: string;
  courseId: string;
  moduleId: string;
  lessonIds: string[];
  title: string;
  learningObjectives: string[];
  agenda: ClassAgendaSegment[];
  estimatedMinutes: number;
  openingBrief: string;
  closingPolicy: string;
  createdAt: string;
}

export interface ClassSessionOpening {
  text: string;
  basis: "authored-context" | "provider" | "fallback";
  createdAt: string;
}

export interface ClassSegmentEvidence {
  segmentId: string;
  activityId?: string;
  attemptedAt: string;
  outcome: "completed" | "failed" | "assisted";
  evidenceIds: string[];
  needsReviewConcepts: string[];
}

export interface ClassSummary {
  title: string;
  activitiesCompleted: string[];
  conceptsPracticed: string[];
  rubricVerified: string[];
  selfAssessed: string[];
  needsReview: string[];
  remediationEncountered: string[];
  nextClassPreview: string;
}

export interface ClassSessionRecord {
  id: string;
  courseId: string;
  planId: string;
  status: ClassSessionRecordStatus;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  activeStartedAt?: string;
  accumulatedActiveMs: number;
  timingValid: boolean;
  opening?: ClassSessionOpening;
  courseSessionId?: string;
  plannedSegments: ClassAgendaSegment[];
  attemptedSegments: ClassSegmentEvidence[];
  conceptsPracticed: string[];
  encounteredReviewConcepts: string[];
  resolvedReviewConcepts: string[];
  openReviewConceptsAtClose: string[];
  /** V1 compatibility mirror; new code derives from the explicit review fields. */
  needsReviewConcepts: string[];
  assistedSegmentIds: string[];
  summary?: ClassSummary;
  assignmentIds: string[];
  /** Teaching continuity only; CourseProgress remains the academic authority. */
  delivery?: LectureDeliveryState;
}

export type AssignmentType = "retrieval-review" | "remediation-review" | "independent-practice" | "lab-follow-up";
export type AssignmentStatus = "open" | "completed";

export interface StudyAssignment {
  id: string;
  courseId: string;
  sourceLessonId: string;
  type: AssignmentType;
  title: string;
  objective: string;
  status: AssignmentStatus;
  createdAt: string;
  completedAt?: string;
}

export interface TeacherBrief {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  objective: string;
  previousClassTitle?: string;
  previousClassSummary?: string;
  recentVerifiedConcepts: string[];
  recentSelfAssessedConcepts: string[];
  activeReviewConcepts: string[];
  academicContext: {
    recentVerifiedConcepts: string[];
    recentSelfAssessedConcepts: string[];
    activeReviewConcepts: string[];
    previousClassSummary?: string;
  };
  sourceEvidenceIds: string[];
  sourceEvidenceReferences: string[];
  remediationSignal?: string;
  recentEvents: string[];
}

export interface StudentAcademicRecord {
  program: ProgramDefinition;
  course: Pick<Course, "id" | "title" | "version" | "contentVersion">;
  enrollment: CourseEnrollment;
  classesCompleted: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  rubricVerified: number;
  selfAssessed: number;
  needsReview: number;
  moduleStatuses: Array<{ moduleId: string; title: string; status: string }>;
  recentClassHistory: Array<{ id: string; title: string; status: ClassSessionRecordStatus; durationMinutes?: number; rubricVerified: number; needsReview: number }>;
  lectureHistory: Array<{ lectureId: string; title: string; classSessionId: string; completedAt?: string; segmentsViewed: number }>;
  labHistory: LabHistoryEntry[];
  assignments: StudyAssignment[];
}

export interface ClassroomState {
  schemaVersion: typeof CLASSROOM_SCHEMA_VERSION;
  lectureCatalogVersion: string;
  academyId: string;
  programId: string;
  enrollments: Record<string, CourseEnrollment>;
  plans: Record<string, ClassSessionPlan>;
  classRecords: Record<string, ClassSessionRecord>;
  assignments: Record<string, StudyAssignment>;
  academicEngagement: AcademicEngagementState;
  labRuns: Record<string, LabRunState>;
  labHistory: LabHistoryEntry[];
  activeLabRunId?: string;
}

export function emptyClassroomState(now = new Date().toISOString()): ClassroomState {
  return {
    schemaVersion: CLASSROOM_SCHEMA_VERSION,
    lectureCatalogVersion: LECTURE_CATALOG_VERSION,
    academyId: SUPPORTED_ACADEMY_ID,
    programId: SUPPORTED_PROGRAM_ID,
    enrollments: {}, plans: {}, classRecords: {}, assignments: {}, academicEngagement: emptyAcademicEngagementState(), labRuns: {}, labHistory: []
  };
}

export function classRecordDurationMinutes(record: ClassSessionRecord): number | undefined {
  if (record.status !== "completed" || !record.endedAt || !record.timingValid) return undefined;
  const ms = record.accumulatedActiveMs;
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 60000) : undefined;
}

export function classRecordIsComplete(record: ClassSessionRecord): boolean {
  return record.status === "completed";
}

function validTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function activeDelta(record: ClassSessionRecord, now: string): number | undefined {
  if (!record.timingValid || !record.activeStartedAt || !validTimestamp(record.activeStartedAt) || !validTimestamp(now)) return undefined;
  const delta = Date.parse(now) - Date.parse(record.activeStartedAt);
  return Number.isFinite(delta) && delta >= 0 ? delta : undefined;
}

export function pauseClassRecord(record: ClassSessionRecord, now: string): ClassSessionRecord {
  const delta = activeDelta(record, now);
  if (delta === undefined) return { ...record, status: "paused", endedAt: now, activeStartedAt: undefined, timingValid: false, lastActivityAt: now };
  return { ...record, status: "paused", endedAt: now, activeStartedAt: undefined, accumulatedActiveMs: record.accumulatedActiveMs + delta, lastActivityAt: now };
}

export function resumeClassRecord(record: ClassSessionRecord, now: string): ClassSessionRecord {
  return { ...record, status: "active", endedAt: undefined, activeStartedAt: now, lastActivityAt: now };
}

export function completeClassRecord(record: ClassSessionRecord, now: string): ClassSessionRecord {
  const delta = activeDelta(record, now);
  if (delta === undefined) return { ...record, status: "completed", endedAt: now, activeStartedAt: undefined, timingValid: false, lastActivityAt: now };
  return { ...record, status: "completed", endedAt: now, activeStartedAt: undefined, accumulatedActiveMs: record.accumulatedActiveMs + delta, lastActivityAt: now };
}

/** Keeps the dependency visible to architectural tests without storing progress in ClassroomState. */
export type AuthoritativeCourseProgress = CourseProgress;


