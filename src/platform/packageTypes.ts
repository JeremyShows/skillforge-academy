export const COURSE_PACKAGE_FORMAT = "skillforge-course" as const;
export const COURSE_PACKAGE_FORMAT_VERSION = 1 as const;

export const PACKAGE_CAPABILITIES = [
  "lecture-delivery", "instructor", "readings", "assignments", "assessments", "remediation",
  "deterministic-labs", "executable-rust-lab", "disposable-linux-runtime", "network-simulation"
] as const;

export type PackageCapability = typeof PACKAGE_CAPABILITIES[number];
export type SupportedPackageCapability = Exclude<PackageCapability, "executable-rust-lab" | "disposable-linux-runtime" | "network-simulation">;
export type PackageJsonValue = string | number | boolean | null | PackageJsonValue[] | { [key: string]: PackageJsonValue };

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
  provenance?: { source?: "built-in" | "local-import" | "private-conformance"; sha256?: string; signatureStatus?: "unsigned" | "verified" | "unverified"; sourceRevision?: string };
  extensionMetadata?: Record<string, PackageJsonValue>;
}

export interface PackageLocation { unitId: string; lessonId?: string; activityId?: string; }

export type CoursePackageActivityType =
  | "instruction" | "concept_explanation" | "worked_example" | "guided_practice" | "scenario" | "code_review" | "debugging_lab"
  | "incident_lab" | "system_design" | "architecture_defense" | "performance_defense" | "security" | "knowledge_check"
  | "multiple_choice" | "short_answer" | "free_response" | "retrieval_practice" | "explain_back" | "interview_drill"
  | "no_notes" | "reflective_prompt" | "flashcard_review" | "pbq" | "mastery_check" | "module_assessment" | "capstone_activity" | "remediation";

export interface CoursePackageMasteryCriterion { id: string; description: string; required: boolean; evidence: "self-assessed" | "verified" | "assisted"; keywords?: string[]; patterns?: string[]; }

export interface CoursePackageActivity {
  id: string; type: CoursePackageActivityType | string; title: string; estimatedMinutes: number; body?: string; prompt?: string;
  objectiveIds?: string[]; conceptIds?: string[]; tags?: string[]; source?: PackageLocation; required?: boolean; formal?: boolean;
  masteryRubric?: CoursePackageMasteryCriterion[]; responseGuide?: string[]; scenario?: string;
  responseType?: "text" | "choice" | "prediction"; responsePrompt?: string; expectedReasoning?: string[]; options?: string[];
  passScore?: number; assessmentId?: string; returnToActivityId?: string; successSignal?: string;
  blocks?: Array<Record<string, PackageJsonValue>>; stages?: Array<{ number: number; title: string; prompt: string; required: boolean }>;
  extensionMetadata?: Record<string, PackageJsonValue>;
}

export interface CoursePackageLesson {
  id: string; title: string; summary: string; objectives: string[]; activities: CoursePackageActivity[];
  prerequisites?: string[]; concepts?: string[]; tags?: string[];
  masteryRule?: { gateActivityId: string; criteria: CoursePackageMasteryCriterion[]; passScore?: number; requiredActivityIds?: string[]; retryPolicy?: "same-lesson" | "remediate-then-retry"; remediationActivityId?: string };
  extensionMetadata?: Record<string, PackageJsonValue>;
}

export interface CoursePackageUnit {
  id: string; title: string; description: string; lessons: CoursePackageLesson[];
  prerequisites?: string[]; masteryRequirements?: string[];
  moduleAssessment?: CoursePackageAssessment;
  extensionMetadata?: Record<string, PackageJsonValue>;
}

export interface CoursePrerequisite { id: string; title: string; requiredUnitIds?: string[]; requiredLessonIds?: string[]; }

export interface CoursePackageDefinition {
  id: string; title: string; description: string; subtitle?: string; subject?: string;
  level?: "beginner" | "intermediate" | "advanced"; audience?: string[];
  type?: "certification" | "course" | "program" | "workshop"; outcomes?: string[]; estimatedTotalMinutes?: number;
  units: CoursePackageUnit[]; prerequisites?: CoursePrerequisite[];
  placement?: { description: string; entryUnitId?: string };
  capstone?: CoursePackageAssessment; finalAssessment?: CoursePackageAssessment;
  metadata?: Record<string, PackageJsonValue>; extensionMetadata?: Record<string, PackageJsonValue>;
}

export type LectureSegmentKind = "opening" | "lecture" | "explanation" | "diagram" | "worked-trace" | "code-walkthrough" | "demonstration" | "pause-and-predict" | "socratic-question" | "knowledge-check" | "guided-practice" | "independent-practice" | "assessment" | "remediation" | "recap" | "closing";

export interface CoursePackageLectureSegment {
  id: string; kind: LectureSegmentKind; title: string; body: string; source?: PackageLocation;
  lessonId?: string; activityId?: string; required?: boolean;
  authoredContent?: { prose?: string; diagram?: string; trace?: string[]; code?: { language: string; source: string } };
  interaction?: { prompt?: string; responseType?: "text" | "choice" | "prediction"; options?: string[] };
  references?: string[];
}
export interface CoursePackageLecture { id: string; title: string; version: string; unitId: string; lessonIds: string[]; segments: CoursePackageLectureSegment[]; estimatedMinutes?: number; }
export interface CoursePackageLectureCatalog { version: string; lectures: CoursePackageLecture[]; }

export type InstructorMode = "TEACH" | "CLARIFY" | "EXPLAIN_DIFFERENTLY" | "HINT" | "SOCRATIC" | "WORKED_EXAMPLE" | "CONNECT_TO_EXPERIENCE" | "CHALLENGE" | "REMEDIATE" | "RECAP" | "OFFICE_HOURS";
export interface CoursePackageInstructorProfile { id: string; displayRole: string; subjectScope: string; pedagogicalInstructions: string[]; allowedModes: InstructorMode[]; fallbackLanguage: string; }

export interface CoursePackageReading { id: string; title: string; body: string; source: PackageLocation; unitId?: string; lessonId?: string; required?: boolean; }
export interface CoursePackageAssignment { id: string; title: string; instructions: string; source: PackageLocation; unitId?: string; lessonId?: string; sourceActivityIds?: string[]; required?: boolean; }
export interface CoursePackageAssessment {
  id: string; title: string; instructions: string; source: PackageLocation; rubric: string[]; unitId?: string;
  kind?: "quiz" | "mastery-gate" | "unit-assessment" | "capstone" | "cumulative-assessment";
  sourceActivityIds?: string[]; required?: boolean; passScore?: number; description?: string; prompt?: string; scenario?: string;
  conceptIds?: string[]; responseGuide?: string; finalIntegration?: boolean; novelScenario?: string; blocks?: Array<Record<string, PackageJsonValue>>;
  sourceLessonIds?: string[]; masteryRubric?: CoursePackageMasteryCriterion[];
  stages?: Array<{ number: number; title: string; prompt: string; required: boolean }>;
}
export interface CoursePackageRemediation { id: string; title: string; instructions: string; source: PackageLocation; unitId?: string; lessonId?: string; sourceActivityIds?: string[]; }

export interface CoursePackageAcademicCatalog {
  version: string;
  program?: { id: string; title: string; description: string; courseIds: string[]; status: "alpha" | "roadmap" };
  syllabus: { id: string; title: string; description: string; learningOutcomes: string[]; policies: string[]; prerequisites: string[]; capstoneAssessmentId?: string };
  units: Array<{ id: string; moduleId: string; title: string; description: string; learningObjectives: string[]; prerequisiteUnitIds: string[] }>;
  readings: CoursePackageReading[]; assignments: CoursePackageAssignment[]; assessments: CoursePackageAssessment[];
  completionRequirements?: { requiredUnitIds: string[]; requiredAssessmentIds: string[]; requiredReadingIds: string[] };
  policySemantics?: Record<string, PackageJsonValue>;
  completionPolicySemantics?: Record<string, PackageJsonValue>;
  assessmentPlanSemantics?: Record<string, PackageJsonValue>;
}

export type LabValue = string | number | boolean;
export type LabConditionOperator = "equals" | "not-equals" | "greater-than" | "less-than";
export interface CoursePackageLabCondition { key: string; operator: LabConditionOperator; value: LabValue; }
export interface CoursePackageLabEffect { key: string; operation: "set" | "increment" | "append"; value: LabValue; }
export interface CoursePackageLabAction { id: string; label: string; instruction: string; preconditions?: CoursePackageLabCondition[]; effects: CoursePackageLabEffect[]; createsObservation?: string; }
export interface CoursePackageLabCheck { id: string; title: string; description: string; required: boolean; conditions: CoursePackageLabCondition[]; sourceLocation?: PackageLocation; }
export interface CoursePackageLabStep {
  id: string; number: number; title: string; kind: "briefing" | "prediction" | "action" | "observation" | "check" | "reflection" | "formal-activity";
  instruction: string; unitId: string; sourceLocation?: PackageLocation; required: boolean; actionIds?: string[]; checkIds?: string[];
  observationPrompt?: string; reflectionPrompt?: string; formalActivityId?: string;
}
export interface CoursePackageLab {
  id: string; number?: number; title: string; purpose: string; unitId: string; sourceLocation?: PackageLocation; sourceLocations?: PackageLocation[];
  learningObjective?: string; estimatedMinutes?: number; required?: boolean;
  environment?: { kind: "simulated-system"; description: string; capabilities: string[]; prohibitedCapabilities: string[] };
  initialState: Record<string, LabValue>; actions: CoursePackageLabAction[]; checks: CoursePackageLabCheck[]; steps: CoursePackageLabStep[];
  requiredStepIds: string[]; reflectionPrompts?: string[]; instructorNote?: string;
}
export interface CoursePackageLabCatalog { version: string; runtimeVersion: string; courseId: string; labs: CoursePackageLab[]; }

export interface CoursePackageAsset { id: string; kind: "image" | "diagram" | "text"; label: string; mediaType: string; byteLength: number; }
export interface CoursePackageMigration { fromCourseVersion: string; toCourseVersion: string; strategy: "preserve" | "reset-required" | "manual-review"; notes: string; }

export interface CoursePackageDocument {
  manifest: CoursePackageManifest; course: CoursePackageDefinition; lectures?: CoursePackageLectureCatalog;
  instructor?: CoursePackageInstructorProfile; academic?: CoursePackageAcademicCatalog;
  readings?: CoursePackageReading[]; assignments?: CoursePackageAssignment[]; assessments?: CoursePackageAssessment[];
  remediation?: CoursePackageRemediation[]; labs?: CoursePackageLabCatalog; assets?: CoursePackageAsset[];
  migrations?: CoursePackageMigration[]; extensionMetadata?: Record<string, PackageJsonValue>;
}
