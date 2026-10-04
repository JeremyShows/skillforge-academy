import type { ContentBundle } from "../content/validate";
import type { AcademicCatalog } from "../academic/types";
import {
  completeActivity, createCourseProgress as createModernCourseProgress, loadCourseProgress as loadModernCourseProgress,
  saveCourseProgress as saveModernCourseProgress, sanitizeCourseProgress
} from "../course/progress";
import type { ActivityOutcome, Course, CourseActivity, CourseLocation, CourseProgress as ModernCourseProgress } from "../course/types";
import type { LectureCatalog, LectureDefinition, LectureSegment } from "../lecture/types";
import type { LabCatalog, LabDefinition } from "../labs/types";
import type { CoursePackageDocument, CoursePackageLab, CoursePackageLabAction, CoursePackageActivity, CoursePackageLectureSegment, InstructorMode, PackageCapability } from "./packageTypes";

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
function modernActivity(activity: CoursePackageActivity): CourseActivity {
  const base = { id: activity.id, title: activity.title, estimatedMinutes: activity.estimatedMinutes, required: activity.required, objectiveIds: activity.objectiveIds };
  if (["worked_example","guided_practice","scenario","code_review","debugging_lab","incident_lab","system_design","architecture_defense","performance_defense","security"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt, body: activity.body, expectedReasoning: activity.responseGuide ?? [], responseRequired: true, responseType: "text", responsePrompt: activity.prompt } as CourseActivity;
  if (["knowledge_check","multiple_choice","short_answer","free_response","retrieval_practice","explain_back","interview_drill","no_notes","reflective_prompt"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, expectedAnswer: activity.responseGuide?.join(" ") ?? activity.body ?? "", responseRequired: true, rubric: activity.responseGuide } as CourseActivity;
  if (["flashcard_review","pbq"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, checks: activity.responseGuide ?? [] } as CourseActivity;
  if (["mastery_check","module_assessment","capstone_activity"].includes(activity.type)) return { ...base, type: activity.type as never, prompt: activity.prompt ?? activity.body ?? activity.title, expectedAnswer: activity.responseGuide?.join(" ") ?? "", passScore: 1, explanation: activity.body ?? "", rubric: { requiredConcepts: (activity.masteryRubric ?? []).map(item => ({ id: item.id, label: item.description, keywords: [], required: item.required })) } } as CourseActivity;
  if (activity.type === "remediation") return { ...base, type: "remediation", body: activity.body ?? "", practicePrompt: activity.prompt ?? "", returnToActivityId: activity.id, successSignal: "Learner revisits the authored activity.", blocks: [] } as CourseActivity;
  return { ...base, type: activity.type === "concept_explanation" ? "concept_explanation" : "instruction", body: activity.body ?? "", keyPoints: activity.responseGuide ?? [], blocks: activity.body ? [{ type: "prose", heading: activity.title, body: activity.body }] : [] } as CourseActivity;
}
function packageToCourse(document: CoursePackageDocument): Course {
  const modules = document.course.units.map(unit => ({
    id: unit.id, title: unit.title, summary: unit.description, learningOutcomes: [],
    prerequisiteModuleIds: unit.prerequisites ?? [], lessons: unit.lessons.map(lesson => {
      const activities = lesson.activities.map(modernActivity);
      const gateActivityId = lesson.masteryRule?.gateActivityId ?? activities[activities.length - 1]?.id ?? "";
      return {
        id: lesson.id, title: lesson.title, summary: lesson.summary, objectives: lesson.objectives, estimatedMinutes: activities.reduce((sum, item) => sum + item.estimatedMinutes, 0),
        activities, masteryRule: { gateActivityId, passScore: 1, requiredActivityIds: activities.filter(item => item.required !== false).map(item => item.id), retryPolicy: "same-lesson" as const },
        remediationActivityId: lesson.masteryRule?.remediationActivityId ?? gateActivityId, conceptIds: lesson.concepts ?? [], tags: lesson.tags ?? []
      };
    }), estimatedMinutes: unit.lessons.reduce((sum, lesson) => sum + lesson.activities.reduce((inner, item) => inner + item.estimatedMinutes, 0), 0),
    masteryRequirements: unit.masteryRequirements ?? []
  }));
  const firstLocation = modules[0]?.lessons[0]?.activities[0] ? { moduleId: modules[0].id, lessonId: modules[0].lessons[0].id, activityId: modules[0].lessons[0].activities[0].id } : undefined;
  const assessment = (input: CoursePackageDocument["course"]["capstone"] | CoursePackageDocument["course"]["finalAssessment"], fallbackId: string) => ({
    id: input?.id ?? fallbackId, title: input?.title ?? "No authored assessment", activityIds: input?.sourceActivityIds ?? (input?.source?.activityId ? [input.source.activityId] : []),
    passScore: 1, description: input?.instructions ?? "No formal assessment authority is declared by this package.", scenario: input?.instructions, responseGuide: input?.rubric?.join("\n"), rubric: { requiredConcepts: [] }, sourceLessonIds: input?.source?.lessonId ? [input.source.lessonId] : [], finalIntegration: false
  });
  if (!firstLocation) throw new Error(`Course ${document.course.id} has no first activity`);
  return {
    id: document.course.id, version: document.manifest.courseVersion, contentVersion: document.manifest.contentVersion,
    title: document.course.title, subtitle: document.course.subtitle ?? document.course.title, description: document.course.description,
    subject: document.course.subject ?? document.course.title, level: document.course.level === "beginner" ? "foundational" : document.course.level ?? "intermediate",
    audience: document.course.audience?.join(", ") ?? "independent learner", prerequisites: document.course.prerequisites?.map(item => item.title) ?? [],
    outcomes: document.course.outcomes ?? [], estimatedTotalMinutes: document.course.estimatedTotalMinutes ?? modules.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    modules, units: modules, optionalResources: [], capstone: assessment(document.course.capstone, "package-capstone"), finalAssessment: assessment(document.course.finalAssessment, "package-final-assessment"),
    metadata: { author: document.manifest.publisher, source: document.manifest.packageId, tags: [] }, visibility: document.manifest.visibilityMetadata?.audience === "private" ? "private" : "public",
    type: document.course.type === "certification" ? "certification" : "technical"
  };
}
function packageLectureToModern(document: CoursePackageDocument, course: Course): LectureCatalog | undefined {
  const catalog = document.lectures; if (!catalog) return undefined;
  const mapKind: Record<string, LectureSegment["type"]> = { "opening":"OPENING","lecture":"LECTURE","explanation":"EXPLANATION","diagram":"DIAGRAM","worked-trace":"WORKED_TRACE","code-walkthrough":"CODE_WALKTHROUGH","demonstration":"DEMONSTRATION","pause-and-predict":"PAUSE_AND_PREDICT","socratic-question":"SOCRATIC_QUESTION","knowledge-check":"KNOWLEDGE_CHECK","guided-practice":"GUIDED_PRACTICE","independent-practice":"INDEPENDENT_PRACTICE","assessment":"ASSESSMENT","remediation":"REMEDIATION","recap":"RECAP","closing":"CLOSING" };
  const lectures: LectureDefinition[] = catalog.lectures.map(lecture => ({
    id: lecture.id, version: lecture.version, courseId: course.id, moduleId: lecture.unitId, lessonIds: lecture.lessonIds, title: lecture.title,
    abstract: lecture.title, objectives: [], prerequisiteConceptIds: [], estimatedMinutes: lecture.estimatedMinutes ?? lecture.segments.length,
    explicit: true, references: [], tags: [], segments: lecture.segments.map(segment => ({
      id: segment.id, type: mapKind[segment.kind] ?? "EXPLANATION", title: segment.title, conceptIds: [], authoredContent: segment.authoredContent?.prose ? { kind: "prose", paragraphs: [segment.authoredContent.prose] } : { kind: "prose", paragraphs: [segment.body] },
      sourceActivityId: segment.activityId, sourceLocation: segment.source ? locationFor(segment.source) : segment.lessonId && segment.activityId ? { moduleId: lecture.unitId, lessonId: segment.lessonId, activityId: segment.activityId } : undefined,
      prompt: segment.interaction?.prompt, expectedInteraction: segment.interaction?.responseType === "prediction" ? "prediction" : segment.interaction?.responseType === "choice" ? "question" : "none",
      references: segment.references ?? [], estimatedMinutes: 1, required: segment.required !== false
    }))
  }));
  return { courseId: course.id, version: catalog.version, lectures, explicitLectureIds: lectures.map(item => item.id) };
}
function packageLabToModern(document: CoursePackageDocument, lab: CoursePackageLab): LabDefinition {
  return {
    id: lab.id, number: 1, courseId: document.course.id, moduleId: lab.unitId, unitId: lab.unitId, title: lab.title, purpose: lab.purpose,
    learningObjective: lab.learningObjective ?? lab.purpose, estimatedMinutes: lab.estimatedMinutes ?? 30, required: false,
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

function packageAcademicToModern(document: CoursePackageDocument, course: Course): AcademicCatalog | undefined {
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
        unitIds, policies: { pace: "self-paced", assistance: { instructionalPractice: "allowed", formalMasteryGate: "marks-assisted-attempt", summativeAndCapstone: "existing-course-policy" }, mastery: "CourseProgress-and-authored-rubric", provider: "optional-bounded-teaching-only", privacy: "local-first-notes-not-shared-automatically", assessment: "fresh-unassisted-evidence-when-required", remediation: "authored-course-and-CourseProgress-policy", completion: "CourseProgress.completedAt", accreditation: false },
        completionRequirements: { requiredActivityPolicy: "complete-required-course-activities", masteryPolicy: "satisfy-authored-mastery-and-module-gates", capstonePolicy: "complete-authored-capstone", prerequisitePolicy: "respect-course-prerequisites", readingCompletionRequired: false },
        assessmentPlan: { assessmentIds: assessments.map(item => item.id), cumulativeAssessmentIds: assessments.filter(item => item.kind === "cumulative-assessment").map(item => item.id), capstoneAssessmentIds: assessments.filter(item => item.kind === "capstone").map(item => item.id), midtermEquivalent: false, finalEquivalent: false },
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
export function recordAssessmentAttempt(progress: CourseProgress): CourseProgress { return { ...progress, assessmentAttempts: progress.assessmentAttempts + 1, updatedAt: new Date().toISOString() }; }
export interface InstructorResponse { mode: InstructorMode; basis: "fallback"; message: string; canChangeProgress: false; evidenceIds: string[]; }
export function deterministicInstructorFallback(context: CourseRuntimeContext, mode: InstructorMode, learnerQuestion: string): InstructorResponse {
  const role = context.instructorProfile?.displayRole ?? "SkillForge Instructor"; const focus = context.instructorProfile?.subjectScope ?? context.course.title; const prompt = learnerQuestion.trim() || "the current activity";
  return { mode, basis: "fallback", message: `${role} is bounded to ${focus}. Start with the authored course material for “${prompt}”, state the evidence you can verify, and identify what would need further practice.`, canChangeProgress: false, evidenceIds: [] };
}

export function publicContentToPlatformNote(content: ContentBundle): string { return `${content.certifications.length} public certification packages are available through the generic registry.`; }
