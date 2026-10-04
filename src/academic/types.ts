import type { CourseLocation, CourseProgress } from "../course/types";

export const ACADEMIC_CATALOG_VERSION = "2026-10-04.2";

export type AcademicReadingKind = "internal-course-text" | "authored-reference" | "paper" | "RFC" | "documentation" | "standard";
export type AcademicAssignmentKind = "practice" | "written-response" | "design" | "code-review" | "incident-analysis" | "project-stage";
export type AcademicAssessmentKind = "mastery-gate" | "quiz" | "unit-assessment" | "cumulative-assessment" | "midterm" | "final" | "project" | "capstone";
export type AcademicItemStatus = "not-started" | "in-progress" | "needs-review" | "self-assessed" | "rubric-verified" | "complete";
export type AcademicUnitStatus = "not-started" | "in-progress" | "needs-review" | "academic-work-complete" | "complete";
export type AcademicUnitAvailabilityState = "current" | "available" | "locked" | "completed";

export interface AcademicProgramDefinition {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  status: "alpha" | "roadmap";
  accreditationClaim: false;
}

export interface CoursePolicyDefinition {
  pace: "self-paced";
  assistance: {
    instructionalPractice: "allowed";
    formalMasteryGate: "marks-assisted-attempt";
    summativeAndCapstone: "existing-course-policy";
  };
  mastery: "CourseProgress-and-authored-rubric";
  provider: "optional-bounded-teaching-only";
  privacy: "local-first-notes-not-shared-automatically";
  assessment: "fresh-unassisted-evidence-when-required";
  remediation: "authored-course-and-CourseProgress-policy";
  completion: "CourseProgress.completedAt";
  accreditation: false;
}

export interface AcademicCompletionRequirements {
  requiredActivityPolicy: "complete-required-course-activities";
  masteryPolicy: "satisfy-authored-mastery-and-module-gates";
  capstonePolicy: "complete-authored-capstone";
  prerequisitePolicy: "respect-course-prerequisites";
  readingCompletionRequired: false;
}

export interface AcademicAssessmentPlan {
  assessmentIds: string[];
  cumulativeAssessmentIds: string[];
  capstoneAssessmentIds: string[];
  midtermEquivalent: false;
  finalEquivalent: false;
}

export interface SyllabusDefinition {
  id: string;
  version: string;
  courseId: string;
  title: string;
  courseDescription: string;
  prerequisites: string[];
  learningOutcomes: string[];
  unitIds: string[];
  policies: CoursePolicyDefinition;
  completionRequirements: AcademicCompletionRequirements;
  assessmentPlan: AcademicAssessmentPlan;
  instructorRole: string;
  pace: "self-paced";
}

export interface AcademicUnitDefinition {
  id: string;
  courseId: string;
  moduleId: string;
  number: number;
  title: string;
  description: string;
  learningOutcomes: string[];
  lectureIds: string[];
  readingIds: string[];
  assignmentIds: string[];
  assessmentIds: string[];
  labIds: string[];
  prerequisiteUnitIds: string[];
}

export type AcademicReadingSource =
  | { type: "lesson-authored-content"; lessonId: string }
  | { type: "existing-course-reference"; value: string; external: boolean };

export interface ReadingDefinition {
  id: string;
  courseId: string;
  unitId: string;
  title: string;
  description: string;
  kind: AcademicReadingKind;
  required: boolean;
  estimatedMinutes: number;
  source: AcademicReadingSource;
  lessonIds: string[];
  lectureIds: string[];
  learningObjectives: string[];
}

export interface AcademicAssignmentDefinition {
  id: string;
  courseId: string;
  unitId: string;
  title: string;
  description: string;
  objectives: string[];
  sourceActivityIds: string[];
  sourceLocations: CourseLocation[];
  required: boolean;
  kind: AcademicAssignmentKind;
  completionPolicy: "all-source-activities-complete";
  assistancePolicy: "existing-course-activity-policy";
  estimatedMinutes: number;
}

export interface AcademicAssessmentDefinition {
  id: string;
  courseId: string;
  unitId?: string;
  title: string;
  description: string;
  kind: AcademicAssessmentKind;
  sourceActivityIds: string[];
  sourceLocations: CourseLocation[];
  coverageConceptIds: string[];
  required: boolean;
  assistancePolicy: "instructional-practice-allowed" | "formal-gate-marks-assisted" | "existing-course-policy";
  completionPolicy: "derived-from-CourseProgress";
  estimatedMinutes: number;
  stageCount?: number;
}

export interface AcademicCourseDefinition {
  id: string;
  courseId: string;
  academicCatalogVersion: string;
  syllabus: SyllabusDefinition;
  units: AcademicUnitDefinition[];
  readings: ReadingDefinition[];
  assignments: AcademicAssignmentDefinition[];
  assessments: AcademicAssessmentDefinition[];
}

export interface AcademicCatalog {
  version: string;
  programs: AcademicProgramDefinition[];
  courses: AcademicCourseDefinition[];
}

export interface AcademicEngagementState {
  academicCatalogVersion: string;
  syllabusViewedAt?: string;
  readingCompletions: Record<string, string>;
}

export function emptyAcademicEngagementState(): AcademicEngagementState {
  return { academicCatalogVersion: ACADEMIC_CATALOG_VERSION, readingCompletions: {} };
}

export interface AcademicAssignmentStatus {
  definition: AcademicAssignmentDefinition;
  status: AcademicItemStatus;
  completedSourceActivityIds: string[];
}

export interface AcademicAssessmentStatus {
  definition: AcademicAssessmentDefinition;
  status: AcademicItemStatus;
  evidence: "none" | "self-assessed" | "verified";
}

export interface AcademicUnitStatusView {
  unit: AcademicUnitDefinition;
  status: AcademicUnitStatus;
  completedLessons: number;
  totalLessons: number;
  lessonsStarted: number;
  readingsCompleted: number;
  readingsTotal: number;
  verifiedLessons: number;
  selfAssessedLessons: number;
  needsReviewLessons: number;
  assignments: AcademicAssignmentStatus[];
  assessments: AcademicAssessmentStatus[];
}

export interface AcademicUnitAvailability {
  unit: AcademicUnitDefinition;
  state: AcademicUnitAvailabilityState;
  launchLocation?: CourseLocation;
  reviewOnly: boolean;
  reason: string;
}

export interface AcademicRecordSummary {
  unitStatuses: AcademicUnitStatusView[];
  assignments: AcademicAssignmentStatus[];
  assessments: AcademicAssessmentStatus[];
  courseComplete: boolean;
  readingEngagementCount: number;
  requiredReadingCount: number;
  progress: CourseProgress;
}


