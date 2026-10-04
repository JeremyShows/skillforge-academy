import type { CourseLocation } from "../course/types";

export const LAB_CATALOG_VERSION = "2026-10-04.1";
export const LAB_RUNTIME_VERSION = "deterministic-local-v1";

export type LabRunStatus = "not-started" | "active" | "paused" | "completed";
export type LabStepKind = "briefing" | "prediction" | "action" | "observation" | "check" | "reflection" | "formal-activity";
export type LabObservationKind = "system" | "learner" | "comparison";
export type LabValue = string | number | boolean;
export type LabState = Record<string, LabValue>;

export interface LabCondition {
  key: string;
  operator: "equals" | "not-equals" | "greater-than" | "less-than";
  value: LabValue;
}

export interface LabEffect {
  key: string;
  operation: "set" | "increment" | "append";
  value: LabValue;
}

export interface LabActionDefinition {
  id: string;
  label: string;
  instruction: string;
  effects: LabEffect[];
  preconditions?: LabCondition[];
  createsObservation?: string;
}

export interface LabStepDefinition {
  id: string;
  number: number;
  title: string;
  kind: LabStepKind;
  instruction: string;
  required: boolean;
  actionIds?: string[];
  checkIds?: string[];
  observationPrompt?: string;
  reflectionPrompt?: string;
  formalActivityId?: string;
  sourceLocation?: CourseLocation;
}

export interface LabCheckDefinition {
  id: string;
  label: string;
  description: string;
  required: boolean;
  conditions: LabCondition[];
  sourceLocation?: CourseLocation;
}

export interface LabEnvironmentDefinition {
  kind: "simulated-system";
  description: string;
  capabilities: string[];
  prohibitedCapabilities: string[];
}

export interface LabDefinition {
  id: string;
  number: number;
  courseId: string;
  moduleId: string;
  unitId: string;
  title: string;
  purpose: string;
  learningObjective: string;
  estimatedMinutes: number;
  required: boolean;
  sourceLocations: CourseLocation[];
  environment: LabEnvironmentDefinition;
  initialState: LabState;
  steps: LabStepDefinition[];
  actions: LabActionDefinition[];
  checks: LabCheckDefinition[];
  requiredStepIds: string[];
  reflectionPrompts: string[];
  instructorNote: string;
}

export interface LabCatalog {
  version: string;
  runtimeVersion: string;
  courseId: string;
  labs: LabDefinition[];
}

export interface LabObservation {
  id: string;
  kind: LabObservationKind;
  label: string;
  text: string;
  createdAt: string;
}

export interface LabActionEvent {
  id: string;
  actionId: string;
  stepId: string;
  label: string;
  createdAt: string;
  changedKeys: string[];
  observation?: string;
}

export interface LabCheckResult {
  checkId: string;
  label: string;
  passed: boolean;
  evaluatedAt: string;
}

export interface LabRunState {
  id: string;
  labId: string;
  courseId: string;
  labCatalogVersion: string;
  runtimeVersion: string;
  status: LabRunStatus;
  currentStepId: string;
  visitedStepIds: string[];
  state: LabState;
  actionHistory: LabActionEvent[];
  observations: LabObservation[];
  checks: LabCheckResult[];
  prediction?: string;
  predictionComparison?: string;
  notes: string[];
  reflections: Record<string, string>;
  resetCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface LabHistoryEntry {
  runId: string;
  labId: string;
  title: string;
  status: "completed" | "paused";
  startedAt: string;
  completedAt?: string;
  resetCount: number;
  checksPassed: number;
  observationsCount: number;
}

export interface LabRuntimePort {
  start(lab: LabDefinition, runId: string, now: string): LabRunState;
  applyAction(lab: LabDefinition, run: LabRunState, stepId: string, actionId: string, now: string): LabRunState;
  evaluateChecks(lab: LabDefinition, run: LabRunState, now: string): LabRunState;
  reset(lab: LabDefinition, run: LabRunState, now: string): LabRunState;
}


