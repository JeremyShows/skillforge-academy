export const COURSE_PACKAGE_FORMAT = "skillforge-course" as const;
export const COURSE_PACKAGE_FORMAT_VERSION = 1 as const;

export const PACKAGE_CAPABILITIES = [
  "lecture-delivery",
  "instructor",
  "readings",
  "assignments",
  "assessments",
  "remediation",
  "deterministic-labs",
  "executable-rust-lab",
  "disposable-linux-runtime",
  "network-simulation"
] as const;

export type PackageCapability = typeof PACKAGE_CAPABILITIES[number];
export type SupportedPackageCapability = Exclude<PackageCapability, "executable-rust-lab" | "disposable-linux-runtime" | "network-simulation">;

export interface CoursePackageManifest {
  format: typeof COURSE_PACKAGE_FORMAT;
  formatVersion: typeof COURSE_PACKAGE_FORMAT_VERSION;
  packageId: string;
  packageVersion: string;
  courseId: string;
  courseVersion: string;
  contentVersion: string;
  title: string;
  description: string;
  publisher?: string;
  authors?: string[];
  license?: string;
  minimumSkillForgeVersion?: string;
  capabilities: PackageCapability[];
  visibilityMetadata?: { audience: "public" | "private" | "local" | "enterprise"; builtIn?: boolean };
  createdAt?: string;
  provenance?: { source?: "built-in" | "local-import" | "private-conformance"; sha256?: string; signatureStatus?: "unsigned" | "verified" | "unverified" };
}

export interface PackageLocation {
  unitId: string;
  lessonId?: string;
  activityId?: string;
}

export interface CoursePackageActivity {
  id: string;
  type: string;
  title: string;
  estimatedMinutes: number;
  body?: string;
  prompt?: string;
  objectiveIds?: string[];
  source?: PackageLocation;
}

export interface CoursePackageLesson {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  activities: CoursePackageActivity[];
}

export interface CoursePackageUnit {
  id: string;
  title: string;
  description: string;
  lessons: CoursePackageLesson[];
}

export interface CoursePrerequisite {
  id: string;
  title: string;
  requiredUnitIds?: string[];
  requiredLessonIds?: string[];
}

export interface CoursePackageDefinition {
  id: string;
  title: string;
  description: string;
  units: CoursePackageUnit[];
  prerequisites?: CoursePrerequisite[];
  placement?: { description: string; entryUnitId?: string };
}

export type LectureSegmentKind = "opening" | "explanation" | "worked-example" | "pause-and-predict" | "guided-practice" | "knowledge-check" | "closing";

export interface CoursePackageLectureSegment {
  id: string;
  kind: LectureSegmentKind;
  title: string;
  body: string;
  lessonId?: string;
  activityId?: string;
}

export interface CoursePackageLecture {
  id: string;
  title: string;
  unitId: string;
  lessonIds: string[];
  segments: CoursePackageLectureSegment[];
}

export interface CoursePackageLectureCatalog {
  version: string;
  lectures: CoursePackageLecture[];
}

export type InstructorMode = "TEACH" | "SOCRATIC" | "EXPLAIN" | "REVIEW" | "LAB" | "ASSESS";

export interface CoursePackageInstructorProfile {
  id: string;
  displayRole: string;
  subjectScope: string;
  pedagogicalInstructions: string[];
  allowedModes: InstructorMode[];
  fallbackLanguage: string;
}

export interface CoursePackageReading {
  id: string;
  title: string;
  body: string;
  source: PackageLocation;
}

export interface CoursePackageAssignment {
  id: string;
  title: string;
  instructions: string;
  source: PackageLocation;
}

export interface CoursePackageAssessment {
  id: string;
  title: string;
  instructions: string;
  source: PackageLocation;
  rubric: string[];
}

export interface CoursePackageRemediation {
  id: string;
  title: string;
  instructions: string;
  source: PackageLocation;
}

export type LabValue = string | number | boolean;
export type LabConditionOperator = "equals" | "not-equals" | "greater-than" | "less-than";

export interface CoursePackageLabCondition {
  key: string;
  operator: LabConditionOperator;
  value: LabValue;
}

export interface CoursePackageLabAction {
  id: string;
  label: string;
  instruction: string;
  preconditions?: CoursePackageLabCondition[];
  effects: { key: string; operation: "set" | "increment"; value: LabValue }[];
}

export interface CoursePackageLabCheck {
  id: string;
  title: string;
  description: string;
  conditions: CoursePackageLabCondition[];
}

export interface CoursePackageLabStep {
  id: string;
  number: number;
  title: string;
  kind: "briefing" | "prediction" | "action" | "observation" | "check" | "reflection";
  instruction: string;
  unitId: string;
  sourceLocation: PackageLocation;
  actionIds?: string[];
  checkIds?: string[];
}

export interface CoursePackageLab {
  id: string;
  title: string;
  purpose: string;
  unitId: string;
  sourceLocation: PackageLocation;
  initialState: Record<string, LabValue>;
  actions: CoursePackageLabAction[];
  checks: CoursePackageLabCheck[];
  steps: CoursePackageLabStep[];
  requiredStepIds: string[];
}

export interface CoursePackageLabCatalog {
  version: string;
  runtimeVersion: string;
  courseId: string;
  labs: CoursePackageLab[];
}

export interface CoursePackageAsset {
  id: string;
  kind: "image" | "diagram" | "text";
  label: string;
  mediaType: string;
  byteLength: number;
}

export interface CoursePackageMigration {
  fromCourseVersion: string;
  toCourseVersion: string;
  strategy: "preserve" | "reset-required" | "manual-review";
  notes: string;
}

export interface CoursePackageDocument {
  manifest: CoursePackageManifest;
  course: CoursePackageDefinition;
  lectures?: CoursePackageLectureCatalog;
  instructor?: CoursePackageInstructorProfile;
  readings?: CoursePackageReading[];
  assignments?: CoursePackageAssignment[];
  assessments?: CoursePackageAssessment[];
  remediation?: CoursePackageRemediation[];
  labs?: CoursePackageLabCatalog;
  assets?: CoursePackageAsset[];
  migrations?: CoursePackageMigration[];
}

