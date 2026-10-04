export type InstructorMode =
  | "TEACH"
  | "CLARIFY"
  | "EXPLAIN_DIFFERENTLY"
  | "HINT"
  | "SOCRATIC"
  | "WORKED_EXAMPLE"
  | "CONNECT_TO_EXPERIENCE"
  | "CHALLENGE"
  | "REMEDIATE"
  | "RECAP"
  | "OFFICE_HOURS";

export interface InstructorTurn {
  mode: InstructorMode;
  learnerMessage: string;
  response: string;
}

export interface InstructorActivityContext {
  id: string;
  type: string;
  title: string;
  prompt?: string;
  body?: string;
  keyPoints?: string[];
}

export interface InstructorContext {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonSummary: string;
  objective: string;
  concept: string;
  activity: InstructorActivityContext;
  verifiedEvidenceIds: string[];
  verifiedEvidenceReferences: string[];
  /** Academic continuity is learner state, not source/project evidence. */
  academicContext?: {
    recentVerifiedConcepts: string[];
    recentSelfAssessedConcepts: string[];
    activeReviewConcepts: string[];
    previousClassSummary?: string;
  };
  learnerMessage: string;
  recentTurns: InstructorTurn[];
}

export interface InstructorResponse {
  mode: InstructorMode;
  message: string;
  basis: "authored-context" | "provider" | "fallback";
  evidenceIds: string[];
  provider?: string;
  model?: string;
  latencyMs?: number;
}

export interface InstructorService {
  respond(context: InstructorContext, mode: InstructorMode): Promise<InstructorResponse>;
  available(): boolean;
}


