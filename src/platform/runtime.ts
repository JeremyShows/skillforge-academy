import type { ContentBundle } from "../content/validate";
import type { AcademicCatalog } from "../academic/types";
import {
  completeActivity, completeRemediation, createCourseProgress as createModernCourseProgress, loadCourseProgress as loadModernCourseProgress,
  saveCourseProgress as saveModernCourseProgress, sanitizeCourseProgress
} from "../course/progress";
import type { ActivityOutcome, Course, CourseActivity, CourseAssessment, CourseLocation, CourseProgress as ModernCourseProgress, InstructionBlock, MasteryCriterion, MasteryRubric } from "../course/types";
import type { LectureCatalog, LectureDefinition, LectureSegment } from "../lecture/types";
import type { LabCatalog, LabDefinition } from "../labs/types";
import type { CoursePackageAssessment, CoursePackageDocument, CoursePackageLab, CoursePackageLabAction, CoursePackageActivity, CoursePackageLectureSegment, CoursePackageMasteryCriterion, InstructorMode, PackageCapability } from "./packageTypes";

export interface CourseRuntimeContext {
  package: CoursePackageDocument;
  course: Course;
  capabilities: PackageCapability[];
  instructorProfile?: CoursePackageDocument["instructor"];
  academicCatalog?: AcademicCatalog;
  lectures?: LectureCatalog;
  labs?: LabCatalog;
  progressNamespace: string;
}

function locationFor(packageLocation: { unitId: string; lessonId?: string; activityId?: string }, fallbackActivity = ""): CourseLocation {
  return { moduleId: packageLocation.unitId, lessonId: packageLocation.lessonId ?? "", activityId: packageLocation.activityId ?? fallbackActivity };
}
function masteryRubric(criteria: CoursePackageMasteryCriterion[] | undefined, passingScore?: number): MasteryRubric {
  const map = (items: CoursePackageMasteryCriterion[] | undefined): MasteryCriterion[] => (items ?? []).map(item => ({ id: item.id, label: item.description, keywords: item.keywords ?? [], patterns: item.patterns, required: item.required }));
  return { requiredConcepts: map(criteria), passingScore };
}
function packageStageRubric(criteria: CoursePackageMasteryCriterion[]): MasteryRubric {
  return masteryRubric(criteria);
}
function authoredBlocks(activity: CoursePackageActivity): InstructionBlock[] | undefined {
  return activity.blocks as InstructionBlock[] | undefined;
}
function modernActivity(activity: CoursePackageActivity): CourseActivity {
  const base = { id: activity.id, title: activity.title, estimatedMinutes: activity.estimatedMinutes, required: activity.required, objectiveIds: activity.objectiveIds, tags: activity.tags };
  if (["worked_example","guided_practice","scenario","code_review","debugging_lab","incident_lab","system_design","architecture_defense","performance_defense","security"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt, body: activity.body, expectedReasoning: activity.expectedReasoning ?? activity.responseGuide ?? [], responseRequired: true, responseType: activity.responseType === "choice" ? "classification" : "text", responsePrompt: activity.responsePrompt ?? activity.prompt, blocks: authoredBlocks(activity) } as CourseActivity;
  if (["knowledge_check","multiple_choice","short_answer","free_response","retrieval_practice","explain_back","interview_drill","no_notes","reflective_prompt"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, expectedAnswer: activity.responseGuide?.join(" ") ?? activity.body ?? "", responseRequired: true, responsePrompt: activity.responsePrompt ?? activity.prompt, rubric: activity.responseGuide, blocks: authoredBlocks(activity) } as CourseActivity;
  if (["flashcard_review","pbq"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, checks: activity.responseGuide ?? [] } as CourseActivity;
  if (["mastery_check","module_assessment","capstone_activity"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, options: activity.options, expectedAnswer: activity.responseGuide?.join(" ") ?? "", passScore: activity.passScore ?? 1, explanation: activity.body ?? "", conceptIds: activity.conceptIds, assessmentId: activity.assessmentId, rubric: masteryRubric(activity.masteryRubric, activity.passScore), blocks: authoredBlocks(activity), stages: activity.stages?.map(stage => ({ ...stage, rubric: { requiredConcepts: [] } })) } as CourseActivity;
  if (activity.type === "remediation") return { ...base, type: "remediation", body: activity.body ?? "", practicePrompt: activity.prompt ?? "", returnToActivityId: activity.returnToActivityId ?? activity.id, successSignal: activity.successSignal ?? "Learner revisits the authored activity.", blocks: authoredBlocks(activity) } as CourseActivity;
  return { ...base, type: activity.type === "concept_explanation" ? "concept_explanation" : "instruction", body: activity.body ?? "", keyPoints: activity.responseGuide ?? [], blocks: authoredBlocks(activity) ?? (activity.body ? [{ type: "prose", heading: activity.title, body: activity.body }] : []) } as CourseActivity;
}
export function packageToCourse(document: CoursePackageDocument): Course {
  const modules = document.course.units.map(unit => ({
    id: unit.id, title: unit.title, summary: unit.description, learningOutcomes: [],
    prerequisiteModuleIds: unit.prerequisites ?? [], lessons: unit.lessons.map(lesson => {
      const activities = lesson.activities.map(modernActivity);
      const gateActivityId = lesson.masteryRule?.gateActivityId ?? activities[activities.length - 1]?.id ?? "";
      const authoredRule = lesson.masteryRule;
      return {
        id: lesson.id, title: lesson.title, summary: lesson.summary, objectives: lesson.objectives, estimatedMinutes: activities.reduce((sum, item) => sum + item.estimatedMinutes, 0),
        activities, masteryRule: { gateActivityId, passScore: authoredRule?.passScore ?? 1, requiredActivityIds: authoredRule?.requiredActivityIds ?? activities.filter(item => item.required !== false).map(item => item.id), retryPolicy: authoredRule?.retryPolicy ?? "same-lesson" },
        remediationActivityId: authoredRule?.remediationActivityId ?? gateActivityId, conceptIds: lesson.concepts ?? [], tags: lesson.tags ?? []
      };
    }), estimatedMinutes: unit.lessons.reduce((sum, lesson) => sum + lesson.activities.reduce((inner, item) => inner + item.estimatedMinutes, 0), 0),
    masteryRequirements: unit.masteryRequirements ?? []
  }));
  const firstLocation = modules[0]?.lessons[0]?.activities[0] ? { moduleId: modules[0].id, lessonId: modules[0].lessons[0].id, activityId: modules[0].lessons[0].activities[0].id } : undefined;
  const assessment = (input: CoursePackageAssessment | undefined, fallbackId: string): CourseAssessment => ({
    id: input?.id ?? fallbackId, title: input?.title ?? "No authored assessment", activityIds: input?.activityIds ?? input?.sourceActivityIds ?? (input?.source?.activityId ? [input.source.activityId] : []),
    passScore: input?.passScore ?? 1, description: input?.description ?? input?.instructions ?? "No formal assessment authority is declared by this package.", scenario: input?.scenario,
    prompt: input?.prompt, responseGuide: input?.responseGuide ?? input?.rubric?.join("\n"), conceptIds: input?.conceptIds, blocks: input?.blocks as InstructionBlock[] | undefined,
    rubric: masteryRubric(input?.masteryRubric), sourceLessonIds: input?.sourceLessonIds ?? (input?.source?.lessonId ? [input.source.lessonId] : []), finalIntegration: input?.finalIntegration, novelScenario: input?.novelScenario,
    stages: input?.stages?.map(stage => ({ number: stage.number, title: stage.title, prompt: stage.prompt, rubric: packageStageRubric(stage.rubric) }))
  });
  if (!firstLocation) throw new Error(`Course ${document.course.id} has no first activity`);
  return {
    id: document.course.id, version: document.manifest.courseVersion, contentVersion: document.manifest.contentVersion,
    title: document.course.title, subtitle: document.course.subtitle ?? document.course.title, description: document.course.description,
    subject: document.course.subject ?? document.course.title, level: document.course.level === "beginner" ? "foundational" : document.course.level ?? "intermediate",
    audience: document.course.audience?.join(", ") ?? "independent learner", prerequisites: document.course.prerequisites?.map(item => item.title) ?? [],
    outcomes: document.course.outcomes ?? [], estimatedTotalMinutes: document.course.estimatedTotalMinutes ?? modules.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    modules: modules.map((module, index) => ({ ...module, moduleAssessment: document.course.units[index]?.moduleAssessment ? assessment(document.course.units[index].moduleAssessment, `${module.id}:assessment`) : undefined })), units: modules.map((module, index) => ({ ...module, moduleAssessment: document.course.units[index]?.moduleAssessment ? assessment(document.course.units[index].moduleAssessment, `${module.id}:assessment`) : undefined })), optionalResources: [], capstone: assessment(document.course.capstone, "package-capstone"), finalAssessment: assessment(document.course.finalAssessment, "package-final-assessment"),
    metadata: { author: document.manifest.publisher, source: document.manifest.packageId, tags: [] }, visibility: document.manifest.visibilityMetadata?.audience === "private" ? "private" : "public",
    type: document.course.type === "certification" ? "certification" : "technical"
  };
}
export function packageLectureToModern(document: CoursePackageDocument, course: Course): LectureCatalog | undefined {
  const catalog = document.lectures; if (!catalog) return undefined;
  const mapKind: Record<string, LectureSegment["type"]> = { "opening":"OPENING","lecture":"LECTURE","explanation":"EXPLANATION","diagram":"DIAGRAM","worked-trace":"WORKED_TRACE","code-walkthrough":"CODE_WALKTHROUGH","demonstration":"DEMONSTRATION","pause-and-predict":"PAUSE_AND_PREDICT","socratic-question":"SOCRATIC_QUESTION","knowledge-check":"KNOWLEDGE_CHECK","guided-practice":"GUIDED_PRACTICE","independent-practice":"INDEPENDENT_PRACTICE","assessment":"ASSESSMENT","remediation":"REMEDIATION","recap":"RECAP","closing":"CLOSING" };
  const lectures: LectureDefinition[] = catalog.lectures.map(lecture => ({
    id: lecture.id, version: lecture.version, courseId: course.id, moduleId: lecture.unitId, lessonIds: lecture.lessonIds, title: lecture.title,
    abstract: lecture.title, objectives: [], prerequisiteConceptIds: [], estimatedMinutes: lecture.estimatedMinutes ?? lecture.segments.length,
    explicit: true, references: [], tags: [], segments: lecture.segments.map(segment => ({
      id: segment.id, type: mapKind[segment.kind] ?? "EXPLANATION", title: segment.title, conceptIds: [], authoredContent: segment.authoredContent?.diagram ? { kind: "diagram", label: segment.title, nodes: [], edges: [], textEquivalent: segment.authoredContent.diagram } : segment.authoredContent?.trace ? { kind: "trace", steps: segment.authoredContent.trace, textEquivalent: segment.body } : segment.authoredContent?.code ? { kind: "code", language: segment.authoredContent.code.language, code: segment.authoredContent.code.source, annotations: [], textEquivalent: segment.body } : segment.authoredContent?.prose ? { kind: "prose", paragraphs: [segment.authoredContent.prose] } : { kind: "prose", paragraphs: [segment.body] },
      sourceActivityId: segment.activityId, sourceLocation: segment.source ? locationFor(segment.source) : segment.lessonId && segment.activityId ? { moduleId: lecture.unitId, lessonId: segment.lessonId, activityId: segment.activityId } : undefined,
      prompt: segment.interaction?.prompt, expectedInteraction: segment.interaction?.responseType ?? "none",
      references: segment.references ?? [], estimatedMinutes: 1, required: segment.required !== false
    }))
  }));
  return { courseId: course.id, version: catalog.version, lectures, explicitLectureIds: lectures.map(item => item.id) };
}
export function packageLabToModern(document: CoursePackageDocument, lab: CoursePackageLab): LabDefinition {
  return {
    id: lab.id, number: lab.number ?? 1, courseId: document.course.id, moduleId: lab.unitId, unitId: lab.unitId, title: lab.title, purpose: lab.purpose,
    learningObjective: lab.learningObjective ?? lab.purpose, estimatedMinutes: lab.estimatedMinutes ?? 30, required: lab.required === true,
    sourceLocations: (lab.sourceLocations ?? (lab.sourceLocation ? [lab.sourceLocation] : [])).map(location => locationFor(location)),
    environment: lab.environment ?? { kind: "simulated-system", description: "Bounded declarative simulation.", capabilities: [], prohibitedCapabilities: ["network","process-execution","native-plugins"] },
    initialState: lab.initialState, steps: lab.steps.map(step => ({ ...step, required: step.required !== false, sourceLocation: step.sourceLocation ? locationFor(step.sourceLocation) : undefined })),
    actions: lab.actions.map(action => ({ ...action })), checks: lab.checks.map(check => ({ id: check.id, label: check.title, description: check.description, required: check.required !== false, conditions: check.conditions, sourceLocation: check.sourceLocation ? locationFor(check.sourceLocation) : undefined })),
    requiredStepIds: lab.requiredStepIds, reflectionPrompts: lab.reflectionPrompts ?? [], instructorNote: lab.instructorNote ?? ""
  };
}
function packageLabsToModern(document: CoursePackageDocument): LabCatalog | undefined {
  if (!document.labs) return undefined;
  return { courseId: document.course.id, version: document.labs.version, runtimeVersion: document.labs.runtimeVersion, labs: document.labs.labs.map(lab => packageLabToModern(document, lab)) };
}

export function packageAcademicToModern(document: CoursePackageDocument, course: Course): AcademicCatalog | undefined {
  const source = document.academic;
  if (!source) return undefined;
  const sourceLocation = (value: { unitId: string; lessonId?: string; activityId?: string }) => locationFor(value);
  const academicCourseId = source.syllabus.id || `${course.id}:academic`;
  const unitIds = source.units.map(unit => unit.id);
  const assessments = source.assessments.map(item => {
    const sourceLocations = item.sourceActivityIds?.length
      ? item.sourceActivityIds.map(activityId => ({ ...sourceLocation(item.source), activityId }))
      : [sourceLocation(item.source)];
    return {
      id: item.id, courseId: course.id, unitId: item.unitId, title: item.title, description: item.instructions,
      kind: item.kind ?? "quiz", sourceActivityIds: item.sourceActivityIds ?? sourceLocations.map(location => location.activityId),
      sourceLocations, coverageConceptIds: [], required: item.required !== false,
      assistancePolicy: item.kind === "mastery-gate" ? "formal-gate-marks-assisted" : "existing-course-policy",
      completionPolicy: "derived-from-CourseProgress", estimatedMinutes: 10, stageCount: item.stages?.length
    } as AcademicCatalog["courses"][number]["assessments"][number];
  });
  return {
    version: source.version,
    programs: [source.program ? { ...source.program, accreditationClaim: false } : { id: `${course.id}:program`, title: course.title, description: course.description, courseIds: [course.id], status: "alpha", accreditationClaim: false }],
    courses: [{
      id: academicCourseId, courseId: course.id, academicCatalogVersion: source.version,
      syllabus: {
        id: source.syllabus.id, version: source.version, courseId: course.id, title: source.syllabus.title,
        courseDescription: source.syllabus.description, prerequisites: source.syllabus.prerequisites, learningOutcomes: source.syllabus.learningOutcomes,
        unitIds, policies: (source.policySemantics ?? { pace: "self-paced", assistance: { instructionalPractice: "allowed", formalMasteryGate: "marks-assisted-attempt", summativeAndCapstone: "existing-course-policy" }, mastery: "CourseProgress-and-authored-rubric", provider: "optional-bounded-teaching-only", privacy: "local-first-notes-not-shared-automatically", assessment: "fresh-unassisted-evidence-when-required", remediation: "authored-course-and-CourseProgress-policy", completion: "CourseProgress.completedAt", accreditation: false }) as AcademicCatalog["courses"][number]["syllabus"]["policies"],
        completionRequirements: (source.completionPolicySemantics ?? { requiredActivityPolicy: "complete-required-course-activities", masteryPolicy: "satisfy-authored-mastery-and-module-gates", capstonePolicy: "complete-authored-capstone", prerequisitePolicy: "respect-course-prerequisites", readingCompletionRequired: false }) as unknown as AcademicCatalog["courses"][number]["syllabus"]["completionRequirements"],
        assessmentPlan: (source.assessmentPlanSemantics ?? { assessmentIds: assessments.map(item => item.id), cumulativeAssessmentIds: assessments.filter(item => item.kind === "cumulative-assessment").map(item => item.id), capstoneAssessmentIds: assessments.filter(item => item.kind === "capstone").map(item => item.id), midtermEquivalent: false, finalEquivalent: false }) as unknown as AcademicCatalog["courses"][number]["syllabus"]["assessmentPlan"],
        instructorRole: "bounded-course-instructor", pace: "self-paced"
      },
      units: source.units.map(unit => ({ id: unit.id, courseId: course.id, moduleId: unit.moduleId, number: source.units.indexOf(unit) + 1, title: unit.title, description: unit.description, learningOutcomes: unit.learningObjectives, lectureIds: [], readingIds: source.readings.filter(item => item.unitId === unit.id).map(item => item.id), assignmentIds: source.assignments.filter(item => item.unitId === unit.id).map(item => item.id), assessmentIds: assessments.filter(item => item.unitId === unit.id).map(item => item.id), labIds: [], prerequisiteUnitIds: unit.prerequisiteUnitIds })),
      readings: source.readings.map(item => ({ id: item.id, courseId: course.id, unitId: item.unitId ?? source.units[0]?.id ?? "", title: item.title, description: item.body, kind: "internal-course-text", required: item.required !== false, estimatedMinutes: 10, source: { type: "lesson-authored-content", lessonId: item.lessonId ?? item.source.lessonId ?? "" }, lessonIds: [item.lessonId ?? item.source.lessonId ?? ""], lectureIds: [], learningObjectives: [] })),
      assignments: source.assignments.map(item => ({ id: item.id, courseId: course.id, unitId: item.unitId ?? source.units[0]?.id ?? "", title: item.title, description: item.instructions, objectives: [], sourceActivityIds: item.sourceActivityIds ?? (item.source.activityId ? [item.source.activityId] : []), sourceLocations: [sourceLocation(item.source)], required: item.required !== false, kind: "practice", completionPolicy: "all-source-activities-complete", assistancePolicy: "existing-course-activity-policy", estimatedMinutes: 10 })),
      assessments
    }]
  };
}

export function createCourseRuntimeContext(document: CoursePackageDocument): CourseRuntimeContext {
  const course = packageToCourse(document);
  return { package: document, course, capabilities: [...document.manifest.capabilities], instructorProfile: document.instructor, academicCatalog: packageAcademicToModern(document, course), lectures: packageLectureToModern(document, course), labs: packageLabsToModern(document), progressNamespace: `${document.manifest.packageId}@${document.manifest.courseVersion}` };
}
export function hasCapability(context: CourseRuntimeContext, capability: PackageCapability): boolean { return context.capabilities.includes(capability); }

export type CourseProgress = ModernCourseProgress & { packageId: string; completedLessonIds: string[]; completedUnitIds: string[]; assessmentAttempts: number; notes: string[]; };
function withCompatibility(progress: ModernCourseProgress, context: CourseRuntimeContext, extras?: Partial<CourseProgress>): CourseProgress {
  return { ...progress, packageId: context.package.manifest.packageId, completedLessonIds: context.course.modules.flatMap(module => module.lessons).filter(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed").map(lesson => lesson.id), completedUnitIds: context.course.modules.filter(module => module.lessons.every(lesson => progress.lessonProgress[lesson.id]?.completionState === "completed")).map(module => module.id), assessmentAttempts: extras?.assessmentAttempts ?? 0, notes: extras?.notes ?? [], ...extras };
}
export function createCourseProgress(context: CourseRuntimeContext, now = new Date().toISOString()): CourseProgress { void now; return withCompatibility(createModernCourseProgress(context.course), context); }
export type CourseProgressMap = Record<string, CourseProgress>;
const PROGRESS_STORAGE_KEY = "skillforge-course-progress-v1";
export function loadCourseProgress(storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): CourseProgressMap {
  if (!storage) return {};
  try { const value = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? "{}") as unknown; return value && typeof value === "object" && !Array.isArray(value) ? value as CourseProgressMap : {}; } catch { return {}; }
}
export function saveCourseProgress(progress: CourseProgressMap, storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void { try { storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch { /* optional browser storage */ } }
export function enrollCourse(map: CourseProgressMap, context: CourseRuntimeContext, _now?: string): CourseProgressMap { const key = context.progressNamespace; return map[key] ? map : { ...map, [key]: createCourseProgress(context) }; }
export function completeAuthoredActivity(context: CourseRuntimeContext, progress: CourseProgress, location: CourseLocation, outcome: ActivityOutcome = { passed: true, masteryEvidence: "self-assessed" }): CourseProgress {
  return withCompatibility(completeActivity(context.course, progress, location, outcome), context, { assessmentAttempts: progress.assessmentAttempts, notes: progress.notes });
}
export function isFormalActivity(activity: CourseActivity | undefined): activity is Extract<CourseActivity, { type: "mastery_check" | "module_assessment" | "capstone_activity" }> { return activity?.type === "mastery_check" || activity?.type === "module_assessment" || activity?.type === "capstone_activity"; }
export interface AssessmentEvaluatorPort { evaluate(activity: Extract<CourseActivity, { type: "mastery_check" | "module_assessment" | "capstone_activity" }>, response: string, stage?: number): ActivityOutcome; }
function invalidFormalOutcome(activityId: string, response: string, stage: number | undefined, validationErrors: string[]): ActivityOutcome {
  return { passed: false, score: 0, response, stage, masteryEvidence: "none", assessment: { activityId, passed: false, score: 0, semanticAvailable: false, provenance: "invalid-semantic", masteryEvidence: "none", criteria: [], missingConceptIds: [], misconceptionIds: [], feedback: "This formal activity has no valid deterministic evaluation contract.", semanticContractValid: false, validationErrors } };
}
export const deterministicRubricEvaluator: AssessmentEvaluatorPort = {
  evaluate(activity, response, stage) {
    const passScore = activity.passScore;
    const criteria = activity.rubric?.requiredConcepts ?? [];
    if (!Number.isFinite(passScore) || passScore <= 0 || passScore > 1) return invalidFormalOutcome(activity.id, response, stage, ["passScore must be greater than 0 and no greater than 1"]);
    if (!criteria.length) return invalidFormalOutcome(activity.id, response, stage, ["mastery rubric must contain at least one criterion"]);
    const text = response.trim().toLocaleLowerCase();
    const results = criteria.map(item => {
      const terms = [...item.keywords, ...(item.patterns ?? [])].filter(term => typeof term === "string" && term.trim()).map(term => term.toLocaleLowerCase());
      const signalAvailable = terms.length > 0;
      const met = signalAvailable && terms.some(term => text.includes(term));
      return { id: item.id, label: item.label, met, status: (met ? "met" : "missing") as "met" | "missing" };
    });
    const unsupported = criteria.filter(item => item.required !== false && ![...item.keywords, ...(item.patterns ?? [])].some(term => typeof term === "string" && term.trim()));
    if (unsupported.length) return invalidFormalOutcome(activity.id, response, stage, unsupported.map(item => `required criterion ${item.id} has no evaluable authored signal`));
    const required = results.filter((_, index) => criteria[index].required !== false);
    const met = required.filter(item => item.met).length;
    const score = required.length ? met / required.length : 0;
    const passed = score >= passScore;
    return { passed, score, response, stage, masteryEvidence: passed ? "self-assessed" : "none", assessment: { activityId: activity.id, passed, score, semanticAvailable: true, provenance: "semantic", masteryEvidence: passed ? "self-assessed" : "none", criteria: results, missingConceptIds: results.filter(item => !item.met).map(item => item.id), misconceptionIds: [], feedback: passed ? "Authored criteria met." : "Review the missing authored criteria and retry.", semanticContractValid: true } };
  }
};
export function evaluateAuthoredActivityResponse(context: CourseRuntimeContext, location: CourseLocation, response: string, stage?: number): ActivityOutcome {
  const activity = context.course.modules.flatMap(module => module.lessons).flatMap(lesson => lesson.activities).find(item => item.id === location.activityId);
  if (!activity) return { passed: false, note: "The authored activity could not be found." };
  const text = response.trim();
  if (activity.type === "instruction" || activity.type === "concept_explanation") return { passed: true, masteryEvidence: "self-assessed", response: text };
  if (activity.type === "remediation") return text ? { passed: true, masteryEvidence: "self-assessed", response: text } : { passed: false, note: "Remediation requires a response." };
  if (!text) return { passed: false, score: 0, response: text, note: "A response is required before this activity can be evaluated." };
  if (!isFormalActivity(activity)) return { passed: true, masteryEvidence: "self-assessed", response: text, note: "Authored practice response recorded." };
  return deterministicRubricEvaluator.evaluate(activity, text, stage);
}
export function applyAuthoredActivityResponse(context: CourseRuntimeContext, progress: CourseProgress, location: CourseLocation, response: string, stage?: number): CourseProgress {
  const activity = context.course.modules.flatMap(module => module.lessons).flatMap(lesson => lesson.activities).find(item => item.id === location.activityId);
  const outcome = evaluateAuthoredActivityResponse(context, location, response, stage);
  const next = activity?.type === "remediation" && outcome.passed ? completeRemediation(context.course, progress, location) : completeAuthoredActivity(context, progress, location, outcome);
  return withCompatibility(next, context, { assessmentAttempts: isFormalActivity(activity) ? progress.assessmentAttempts + 1 : progress.assessmentAttempts, notes: progress.notes });
}
export function recordAssessmentAttempt(progress: CourseProgress): CourseProgress { return { ...progress, assessmentAttempts: progress.assessmentAttempts + 1, updatedAt: new Date().toISOString() }; }
export interface InstructorResponse { mode: InstructorMode; basis: "fallback"; message: string; canChangeProgress: false; evidenceIds: string[]; }
export function deterministicInstructorFallback(context: CourseRuntimeContext, mode: InstructorMode, learnerQuestion: string): InstructorResponse {
  const role = context.instructorProfile?.displayRole ?? "SkillForge Instructor"; const focus = context.instructorProfile?.subjectScope ?? context.course.title; const prompt = learnerQuestion.trim() || "the current activity";
  return { mode, basis: "fallback", message: `${role} is bounded to ${focus}. Start with the authored course material for “${prompt}”, state the evidence you can verify, and identify what would need further practice.`, canChangeProgress: false, evidenceIds: [] };
}

export function publicContentToPlatformNote(content: ContentBundle): string { return `${content.certifications.length} public certification packages are available through the generic registry.`; }
