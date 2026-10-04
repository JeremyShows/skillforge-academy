/**
 * Reusable instructional-course domain types.  Certification banks remain
 * their own content system; these types describe a class that teaches, checks,
 * remediates, and advances a learner through stable authored IDs.
 */

export type CourseType = "certification" | "professional" | "interview" | "technical" | "course" | "custom-private";
export type CourseVisibility = "public" | "private" | "local";
export type CourseLevel = "foundational" | "intermediate" | "advanced" | "senior" | "principal";
export type ActivityState = "not-started" | "in-progress" | "completed";
export type MasteryState = "not-started" | "mastered" | "needs-review";
export type AcademicMasteryState = "not-assessed" | "needs-review" | "self-assessed" | "verified";
export type MasteryEvidence = "none" | "self-assessed" | "verified";
export type AssessmentProvenance = "semantic" | "authored-fallback" | "invalid-semantic" | "self-check";
export type PracticeResponseType = "text" | "classification" | "ordered-steps" | "decision";

export type InstructionBlock =
  | { type: "prose"; heading: string; body: string }
  | { type: "code"; heading: string; language: string; code: string; annotations?: string[] }
  | { type: "comparison"; heading: string; columns: string[]; rows: string[][] }
  | { type: "timeline" | "trace" | "failure-trace"; heading: string; steps: string[] }
  | { type: "measurement"; heading: string; columns: string[]; rows: string[][]; takeaway: string }
  | { type: "decision"; heading: string; options: Array<{ label: string; tradeoff: string }> }
  | { type: "callout"; heading: string; body: string; tone?: "note" | "warning" | "rule" };

export interface MasteryCriterion {
  id: string;
  label: string;
  keywords: string[];
  /** Explicit deterministic fallback phrases; never inferred from lesson prose. */
  patterns?: string[];
  required?: boolean;
}

export interface MasteryRubric {
  requiredConcepts: MasteryCriterion[];
  requiredQualifiers?: MasteryCriterion[];
  prohibitedMisconceptions?: MasteryCriterion[];
  minimumWords?: number;
  passingScore?: number;
}

export interface CriterionResult {
  id: string;
  label: string;
  met: boolean;
  status: "met" | "missing" | "flagged";
}

export interface CourseAssessmentResult {
  activityId: string;
  passed: boolean;
  score: number;
  semanticAvailable: boolean;
  provenance: AssessmentProvenance;
  masteryEvidence: MasteryEvidence;
  criteria: CriterionResult[];
  missingConceptIds: string[];
  misconceptionIds: string[];
  feedback: string;
  semanticContractValid?: boolean;
  validationErrors?: string[];
}

export interface CourseMetadata {
  author?: string;
  source?: string;
  tags: string[];
  updatedAt?: string;
}

export interface ActivityBase {
  id: string;
  title: string;
  estimatedMinutes: number;
  required?: boolean;
  objectiveIds?: string[];
  tags?: string[];
  authoredContentId?: string;
}

export interface TeachingActivity extends ActivityBase {
  type: "instruction" | "concept_explanation";
  body: string;
  keyPoints: string[];
  whyItMatters?: string;
  blocks?: InstructionBlock[];
}

export interface PracticeActivity extends ActivityBase {
  type: "worked_example" | "guided_practice" | "scenario" | "code_review" | "debugging_lab" | "incident_lab" | "system_design" | "architecture_defense" | "performance_defense" | "security";
  prompt?: string;
  body?: string;
  context?: string;
  steps?: string[];
  hints?: string[];
  expectedReasoning: string[];
  answer?: string;
  blocks?: InstructionBlock[];
  responseRequired?: boolean;
  responseType?: PracticeResponseType;
  responsePrompt?: string;
  pedagogicalRole?: "worked" | "guided" | "transfer";
}

export interface RetrievalActivity extends ActivityBase {
  type: "knowledge_check" | "multiple_choice" | "short_answer" | "free_response" | "retrieval_practice" | "explain_back" | "interview_drill" | "no_notes" | "reflective_prompt";
  prompt: string;
  context?: string;
  expectedAnswer: string;
  commonMistake?: string;
  exerciseId?: string;
  rubric?: string[];
  blocks?: InstructionBlock[];
  responseRequired?: boolean;
  responsePrompt?: string;
  pedagogicalRole?: "transfer";
}

export interface EmbeddedToolActivity extends ActivityBase {
  type: "flashcard_review" | "pbq";
  prompt: string;
  front?: string;
  back?: string;
  scenario?: string;
  checks: string[];
  sourceId?: string;
  responseRequired?: boolean;
  responsePrompt?: string;
  pedagogicalRole?: "transfer";
}

export interface GateActivity extends ActivityBase {
  type: "mastery_check" | "module_assessment" | "capstone_activity";
  prompt: string;
  options?: string[];
  answer?: number;
  expectedAnswer: string;
  passScore: number;
  explanation: string;
  rubric: MasteryRubric;
  blocks?: InstructionBlock[];
  conceptIds?: string[];
  stage?: number;
  assessmentId?: string;
}

export interface RemediationActivity extends ActivityBase {
  type: "remediation";
  body: string;
  practicePrompt: string;
  returnToActivityId: string;
  successSignal: string;
  blocks?: InstructionBlock[];
  misconceptionIds?: string[];
  remediationPaths?: Record<string, { signalId: string; title: string; body: string; blocks: InstructionBlock[]; retryPrompt: string }>;
  retryPrompt?: string;
}

export type CourseActivity = TeachingActivity | PracticeActivity | RetrievalActivity | EmbeddedToolActivity | GateActivity | RemediationActivity;

export interface LessonMasteryRule {
  gateActivityId: string;
  passScore: number;
  requiredActivityIds: string[];
  retryPolicy: "same-lesson" | "remediate-then-retry";
}

export interface CourseLesson {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  estimatedMinutes: number;
  prerequisiteKnowledge?: string[];
  prerequisiteLessonIds?: string[];
  conceptIds?: string[];
  externalPrerequisites?: string[];
  activities: CourseActivity[];
  masteryRule: LessonMasteryRule;
  remediationActivityId: string;
  references?: string[];
  tags: string[];
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  learningOutcomes: string[];
  prerequisiteModuleIds: string[];
  lessons: CourseLesson[];
  estimatedMinutes: number;
  masteryRequirements: string[];
  moduleAssessment?: CourseAssessment;
  prerequisiteConceptIds?: string[];
}

export interface CourseAssessment {
  id: string;
  title: string;
  activityIds: string[];
  passScore: number;
  description: string;
  /** Authored case shown before the learner prompt for cumulative assessments. */
  scenario?: string;
  /** Authored learner-facing task; kept separate from the rubric and response guide. */
  prompt?: string;
  /** Typed teaching/assessment blocks owned by the curriculum. */
  blocks?: InstructionBlock[];
  /** Lesson families represented by the integrated case. */
  sourceLessonIds?: string[];
  /** Internal reference outline; never derived from the final lesson answer. */
  responseGuide?: string;
  conceptIds?: string[];
  rubric?: MasteryRubric;
  novelScenario?: string;
  stages?: Array<{ number: number; title: string; prompt: string; rubric: MasteryRubric }>;
  finalIntegration?: boolean;
}

export interface Course {
  id: string;
  version: string;
  /** Authored content revision; separate from the learner-state schema/version. */
  contentVersion: string;
  title: string;
  subtitle: string;
  description: string;
  subject: string;
  level: CourseLevel;
  audience: string;
  prerequisites: string[];
  prerequisiteConceptIds?: string[];
  outcomes: string[];
  estimatedTotalMinutes: number;
  modules: CourseModule[];
  /** Package-contract alias retained at the boundary; modules are authoritative internally. */
  units: CourseModule[];
  optionalResources: string[];
  capstone: CourseAssessment;
  finalAssessment: CourseAssessment;
  metadata: CourseMetadata;
  visibility: CourseVisibility;
  type: CourseType;
}

export interface CourseLocation {
  moduleId: string;
  lessonId: string;
  activityId: string;
}

export interface LessonProgress {
  state: ActivityState;
  completedActivityIds: string[];
  mastery: MasteryState;
  masteryEvidence: MasteryEvidence;
  completionState: ActivityState;
  masteryState: AcademicMasteryState;
  attempts: number;
  remediationCount: number;
  remediationPathId?: string;
  lastScore?: number;
  returnToActivityId?: string;
  updatedAt: string;
}

export interface ModuleProgress {
  completedLessonIds: string[];
  mastery: MasteryState;
  completionState: ActivityState;
  masteryState: AcademicMasteryState;
  assessmentPassed?: boolean;
  assessmentEvidence?: MasteryEvidence;
  updatedAt: string;
}

export interface CapstoneProgress {
  currentStage: number;
  completedStageNumbers: number[];
  responses: Record<string, string>;
  assessments: Record<string, CourseAssessmentResult>;
  assistedStageNumbers: number[];
  finalIntegrationPassed: boolean;
  updatedAt: string;
}

export type ClassSessionStatus = "active" | "paused" | "completed";
export type ClassSessionMode = "guided" | "remediation" | "review";

export interface ClassSession {
  id: string;
  courseId: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  status: ClassSessionStatus;
  mode: ClassSessionMode;
  current?: CourseLocation;
}

export interface CourseReviewItem {
  id: string;
  lessonId: string;
  activityId: string;
  reason: "failed-mastery" | "weak-response" | "high-confidence-error" | "manual-review";
  concept: string;
  createdAt: string;
}

export interface CourseProgress {
  courseId: string;
  courseVersion: string;
  /** Content revision used to author this progress, kept distinct from course version. */
  contentVersion: string;
  current: CourseLocation;
  lessonProgress: Record<string, LessonProgress>;
  moduleProgress: Record<string, ModuleProgress>;
  reviewQueue: CourseReviewItem[];
  sessions: ClassSession[];
  activeSessionId?: string;
  weaknessTags: string[];
  assistedActivityIds: string[];
  capstone?: CapstoneProgress;
  sessionStartedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export type ActivityOutcome = {
  passed: boolean;
  score?: number;
  weaknessTags?: string[];
  note?: string;
  response?: string;
  assessment?: CourseAssessmentResult;
  masteryEvidence?: MasteryEvidence;
  assisted?: boolean;
  stage?: number;
};

export interface CourseValidationIssue {
  code: string;
  path: string;
  message: string;
}

