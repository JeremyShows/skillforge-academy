import type { LabActionDefinition, LabCheckDefinition, LabCondition, LabDefinition, LabObservation, LabObservationKind, LabRunState, LabRuntimePort, LabState, LabValue } from "./types";
import { LAB_CATALOG_VERSION, LAB_RUNTIME_VERSION } from "./types";

const MAX_ACTIONS = 128;
const MAX_OBSERVATIONS = 128;
const MAX_NOTES = 64;
const MAX_NOTE_LENGTH = 1000;

function conditionPasses(state: LabState, condition: LabCondition): boolean {
  const current = state[condition.key];
  switch (condition.operator) {
    case "equals": return current === condition.value;
    case "not-equals": return current !== condition.value;
    case "greater-than": return typeof current === "number" && typeof condition.value === "number" && current > condition.value;
    case "less-than": return typeof current === "number" && typeof condition.value === "number" && current < condition.value;
  }
}

function effectState(state: LabState, action: LabActionDefinition): { state: LabState; changedKeys: string[] } {
  const next = { ...state };
  const changedKeys: string[] = [];
  for (const effect of action.effects) {
    const previous = next[effect.key];
    if (effect.operation === "set") next[effect.key] = effect.value;
    if (effect.operation === "increment" && typeof previous === "number" && typeof effect.value === "number") next[effect.key] = previous + effect.value;
    if (effect.operation === "append") next[effect.key] = `${previous ?? ""}${effect.value}`;
    if (next[effect.key] !== previous) changedKeys.push(effect.key);
  }
  return { state: next, changedKeys };
}

function checksFor(run: LabRunState, lab: LabDefinition, now: string): LabRunState["checks"] {
  return lab.checks.map(check => ({ checkId: check.id, label: check.label, passed: check.conditions.every(condition => conditionPasses(run.state, condition)), evaluatedAt: now }));
}

export function createLabRun(lab: LabDefinition, runId = `lab-run:${lab.id}:${Date.now()}`, now = new Date().toISOString()): LabRunState {
  return {
    id: runId, labId: lab.id, courseId: lab.courseId, labCatalogVersion: LAB_CATALOG_VERSION, runtimeVersion: LAB_RUNTIME_VERSION,
    status: "active", currentStepId: lab.steps[0]?.id ?? "", visitedStepIds: lab.steps[0] ? [lab.steps[0].id] : [], state: { ...lab.initialState },
    actionHistory: [], observations: [], checks: [], notes: [], reflections: {}, resetCount: 0, startedAt: now, updatedAt: now,
  };
}

export function applyLabAction(lab: LabDefinition, run: LabRunState, stepId: string, actionId: string, now: string): LabRunState {
  if (run.status !== "active" || run.currentStepId !== stepId) return run;
  const step = lab.steps.find(item => item.id === stepId);
  if (!step || step.kind !== "action" || !step.actionIds?.includes(actionId)) return run;
  const action = lab.actions.find(item => item.id === actionId);
  if (!action || (action.preconditions && !action.preconditions.every(condition => conditionPasses(run.state, condition)))) return run;
  const effected = effectState(run.state, action);
  const nextStep = lab.steps.find(item => item.number > step.number);
  const observationText = action.createsObservation;
  return {
    ...run,
    currentStepId: nextStep?.id ?? stepId,
    visitedStepIds: [...new Set([...run.visitedStepIds, stepId, ...(nextStep ? [nextStep.id] : [])])].slice(0, 64),
    state: effected.state,
    actionHistory: [...run.actionHistory, { id: `${run.id}:action:${run.actionHistory.length + 1}`, actionId, stepId, label: action.label, createdAt: now, changedKeys: effected.changedKeys, observation: observationText }].slice(-MAX_ACTIONS),
    observations: observationText ? [...run.observations, { id: `${run.id}:observation:${run.observations.length + 1}`, kind: "system", label: action.label, text: observationText, createdAt: now } as LabObservation].slice(-MAX_OBSERVATIONS) : run.observations,
    updatedAt: now,
  };
}

export function evaluateLabChecks(lab: LabDefinition, run: LabRunState, now: string): LabRunState {
  return { ...run, checks: checksFor(run, lab, now), updatedAt: now };
}

export function visitLabStep(lab: LabDefinition, run: LabRunState, stepId: string, now: string): LabRunState {
  const step = lab.steps.find(item => item.id === stepId);
  if (!step) return run;
  return { ...run, currentStepId: stepId, visitedStepIds: [...new Set([...run.visitedStepIds, stepId])].slice(0, 64), updatedAt: now };
}

export function recordLabObservation(run: LabRunState, kind: LabObservationKind, label: string, text: string, now: string): LabRunState {
  const bounded = text.trim().slice(0, MAX_NOTE_LENGTH);
  if (!bounded) return run;
  return { ...run, observations: [...run.observations, { id: `${run.id}:observation:${run.observations.length + 1}`, kind, label: label.trim().slice(0, 180), text: bounded, createdAt: now }].slice(-MAX_OBSERVATIONS), updatedAt: now };
}

export function pauseLabRun(run: LabRunState, now: string): LabRunState { return run.status === "active" ? { ...run, status: "paused", updatedAt: now } : run; }
export function resumeLabRun(run: LabRunState, now: string): LabRunState { return run.status === "paused" ? { ...run, status: "active", updatedAt: now } : run; }

export function resetLabRun(lab: LabDefinition, run: LabRunState, now: string): LabRunState {
  const fresh = createLabRun(lab, run.id, now);
  return { ...fresh, resetCount: run.resetCount + 1, notes: run.notes.slice(0, MAX_NOTES), reflections: { ...run.reflections }, startedAt: run.startedAt, updatedAt: now };
}

export function addLabNote(run: LabRunState, note: string, now: string): LabRunState {
  const bounded = note.trim().slice(0, MAX_NOTE_LENGTH);
  if (!bounded) return run;
  return { ...run, notes: [...run.notes, bounded].slice(-MAX_NOTES), updatedAt: now };
}

export function recordLabPrediction(lab: LabDefinition, run: LabRunState, stepId: string, prediction: string, now: string): LabRunState {
  const step = lab.steps.find(item => item.id === stepId);
  const bounded = prediction.trim().slice(0, MAX_NOTE_LENGTH);
  if (run.status !== "active" || !step || step.kind !== "prediction" || !bounded) return run;
  const nextStep = lab.steps.find(item => item.number > step.number);
  return { ...run, prediction: bounded, currentStepId: nextStep?.id ?? step.id, visitedStepIds: [...new Set([...run.visitedStepIds, step.id])].slice(0, 64), updatedAt: now };
}

export function recordLabReflection(run: LabRunState, stepId: string, reflection: string, now: string): LabRunState {
  const bounded = reflection.trim().slice(0, MAX_NOTE_LENGTH);
  if (!bounded) return run;
  return { ...run, reflections: { ...run.reflections, [stepId]: bounded }, updatedAt: now };
}

export function compareLabPrediction(run: LabRunState, comparison: string, now: string): LabRunState {
  return { ...run, predictionComparison: comparison.trim().slice(0, MAX_NOTE_LENGTH), updatedAt: now };
}

export function completeLabRun(lab: LabDefinition, run: LabRunState, now: string): LabRunState {
  const evaluated = evaluateLabChecks(lab, run, now);
  const requiredStepsVisited = lab.requiredStepIds.every(id => evaluated.visitedStepIds.includes(id));
  const requiredPredictionsRecorded = lab.steps.filter(step => step.required && step.kind === "prediction").every(step => evaluated.visitedStepIds.includes(step.id) && Boolean(evaluated.prediction?.trim()));
  const requiredChecksPassed = lab.checks.filter(check => check.required).every(check => evaluated.checks.find(result => result.checkId === check.id)?.passed);
  const requiredReflections = lab.steps.filter(step => step.required && step.kind === "reflection").every(step => Boolean(evaluated.reflections[step.id]?.trim()));
  if (!requiredStepsVisited || !requiredPredictionsRecorded || !requiredChecksPassed || !requiredReflections) return evaluated;
  return { ...evaluated, status: "completed", completedAt: now, updatedAt: now };
}

export const deterministicLocalLabRuntime: LabRuntimePort = {
  start: createLabRun,
  applyAction: applyLabAction,
  evaluateChecks: evaluateLabChecks,
  reset: resetLabRun,
};

export function checkDefinitionPasses(state: LabState, check: LabCheckDefinition): boolean { return check.conditions.every(condition => conditionPasses(state, condition)); }

