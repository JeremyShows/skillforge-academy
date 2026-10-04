import type { Certification, Lesson } from "../types";
import type { ContentBundle } from "../content/validate";
import { contentRevision } from "../content/revision";
import type { CoursePackageDocument, CoursePackageLab } from "./packageTypes";

function lessonBody(lesson: Lesson): string {
  return lesson.sections.map(section => [section.heading, section.body, ...(section.bullets ?? [])].filter(Boolean).join("\n")).join("\n\n");
}

function location(unitId: string, lessonId: string, activityId: string) { return { unitId, lessonId, activityId }; }

function publicLab(cert: Certification, unitId: string, sourceLesson: Lesson): CoursePackageLab {
  const prefix = `${cert.id}:deterministic-backup-recovery`;
  const source = location(unitId, sourceLesson.id, `${sourceLesson.id}:lesson`);
  return {
    id: prefix,
    title: "Backup evidence and recovery decision",
    purpose: "Use a bounded local model to distinguish a backup claim from verified recovery evidence.",
    unitId,
    sourceLocation: source,
    initialState: { backupStatus: "claimed", restoreTest: "not-run", decision: "undecided" },
    actions: [{ id: `${prefix}:verify-restore`, label: "Verify a restore sample", instruction: "Run the authored restore check before trusting the backup claim.", effects: [{ key: "restoreTest", operation: "set", value: "passed" }, { key: "decision", operation: "set", value: "trust-with-evidence" }] }],
    checks: [{ id: `${prefix}:evidence-present`, title: "Recovery evidence is present", description: "The decision requires a passed restore test.", conditions: [{ key: "restoreTest", operator: "equals", value: "passed" }, { key: "decision", operator: "equals", value: "trust-with-evidence" }] }],
    steps: [
      { id: `${prefix}:brief`, number: 1, title: "Frame the recovery claim", kind: "briefing", instruction: "Separate a backup claim from evidence that data can be restored.", unitId, sourceLocation: source },
      { id: `${prefix}:predict`, number: 2, title: "Predict before acting", kind: "prediction", instruction: "Write what you expect the restore check to show.", unitId, sourceLocation: source },
      { id: `${prefix}:act`, number: 3, title: "Run the authored check", kind: "action", instruction: "Choose the bounded restore verification action.", unitId, sourceLocation: source, actionIds: [`${prefix}:verify-restore`] },
      { id: `${prefix}:check`, number: 4, title: "Evaluate recovery evidence", kind: "check", instruction: "Confirm the restore evidence supports the decision.", unitId, sourceLocation: source, checkIds: [`${prefix}:evidence-present`] },
      { id: `${prefix}:reflect`, number: 5, title: "Reflect on the boundary", kind: "reflection", instruction: "Describe what the restore test proves and what it does not prove.", unitId, sourceLocation: source }
    ],
    requiredStepIds: [`${prefix}:brief`, `${prefix}:predict`, `${prefix}:act`, `${prefix}:check`, `${prefix}:reflect`]
  };
}

export function buildPublicCoursePackage(content: ContentBundle, cert: Certification): CoursePackageDocument {
  const domains = content.domains.filter(domain => domain.certId === cert.id);
  const lessons = content.lessons.filter(lesson => lesson.certId === cert.id);
  const units = domains.map(domain => {
    const unitLessons = lessons.filter(lesson => lesson.domain === domain.id);
    return {
      id: domain.id,
      title: domain.name,
      description: domain.description,
      lessons: unitLessons.map(lesson => {
        const activityId = `${lesson.id}:lesson`;
        return { id: lesson.id, title: lesson.title, summary: lesson.sections[0]?.body ?? lesson.title, objectives: lesson.objectives, activities: [{ id: activityId, type: "reading", title: `Study ${lesson.title}`, estimatedMinutes: lesson.estMinutes, body: lessonBody(lesson), objectiveIds: lesson.objectiveId ? [lesson.objectiveId] : [], source: location(domain.id, lesson.id, activityId) }] };
      })
    };
  });
  const lectureCatalog = { version: "1.0.0", lectures: units.map(unit => ({ id: `${cert.id}:${unit.id}:lecture`, title: `${unit.title} lecture`, unitId: unit.id, lessonIds: unit.lessons.map(lesson => lesson.id), segments: unit.lessons.map(lesson => ({ id: `${lesson.id}:lecture`, kind: "explanation" as const, title: lesson.title, body: lesson.activities[0]?.body ?? lesson.summary, lessonId: lesson.id, activityId: lesson.activities[0]?.id })) })) };
  const firstLesson = units[0]?.lessons[0];
  const capabilities = ["lecture-delivery", "instructor", "readings", "assignments", "assessments", "remediation"] as const;
  const labs = firstLesson && units[0] ? { version: "1.0.0", runtimeVersion: "1.0.0", courseId: cert.id, labs: [publicLab(cert, units[0].id, lessons.find(lesson => lesson.id === firstLesson.id) ?? lessons[0])] } : undefined;
  return {
    manifest: { format: "skillforge-course", formatVersion: 1, packageId: `builtin.${cert.id}`, packageVersion: "1.0.0", courseId: cert.id, courseVersion: "1.0.0", contentVersion: contentRevision(content), title: cert.name, description: cert.description, publisher: "SkillForge", authors: ["SkillForge contributors"], license: "Apache-2.0", capabilities: [...capabilities, ...(labs ? ["deterministic-labs" as const] : [])], visibilityMetadata: { audience: "public", builtIn: true }, provenance: { source: "built-in", signatureStatus: "unsigned" } },
    course: { id: cert.id, title: cert.name, description: cert.description, units, prerequisites: [], placement: { description: "Start with the first available unit; placement is advisory and never changes mastery." } },
    lectures: lectureCatalog,
    instructor: { id: "skillforge-instructor", displayRole: "Course Instructor", subjectScope: cert.name, pedagogicalInstructions: ["Stay within the authored course material.", "Use deterministic fallback language when no provider is configured.", "Never grant mastery or alter academic progress."], allowedModes: ["TEACH", "SOCRATIC", "EXPLAIN", "REVIEW", "ASSESS"], fallbackLanguage: "Use the authored lesson, state the evidence, and identify the next practice step." },
    readings: units.flatMap(unit => unit.lessons.map(lesson => ({ id: `${lesson.id}:reading`, title: lesson.title, body: lesson.activities[0]?.body ?? lesson.summary, source: location(unit.id, lesson.id, lesson.activities[0]?.id ?? "") }))),
    assignments: units.map(unit => ({ id: `${unit.id}:assignment`, title: `${unit.title} applied review`, instructions: `Explain the key decisions from ${unit.title} and connect them to a troubleshooting scenario.`, source: location(unit.id, unit.lessons[0]?.id ?? "", unit.lessons[0]?.activities[0]?.id ?? "") })),
    assessments: cert.exams.map(exam => ({ id: `${cert.id}:${exam.id}:assessment`, title: `${exam.name || exam.id} readiness check`, instructions: "Use the existing practice and mock-exam tools to assess readiness; this package record does not grant certification.", source: location(units[0]?.id ?? "", units[0]?.lessons[0]?.id ?? "", units[0]?.lessons[0]?.activities[0]?.id ?? ""), rubric: ["Evidence is accurate", "Reasoning is explicit", "Uncertainty is acknowledged"] })),
    remediation: units.map(unit => ({ id: `${unit.id}:remediation`, title: `${unit.title} revisit`, instructions: "Return to the authored readings and practice questions for this unit.", source: location(unit.id, unit.lessons[0]?.id ?? "", unit.lessons[0]?.activities[0]?.id ?? "") })),
    ...(labs ? { labs } : {})
  };
}

export function buildPublicPackages(content: ContentBundle): CoursePackageDocument[] {
  return content.certifications.filter(cert => cert.status !== "coming-soon").map(cert => buildPublicCoursePackage(content, cert));
}
