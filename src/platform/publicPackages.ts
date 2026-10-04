import type { Certification, Lesson } from "../types";
import type { ContentBundle } from "../content/validate";
import { contentRevision } from "../content/revision";
import type { CoursePackageDocument } from "./packageTypes";

function lessonBody(lesson: Lesson): string {
  return lesson.sections.map(section => [section.heading, section.body, ...(section.bullets ?? [])].filter(Boolean).join("\n")).join("\n\n");
}
function location(unitId: string, lessonId: string, activityId: string) { return { unitId, lessonId, activityId }; }

export function buildPublicCoursePackage(content: ContentBundle, cert: Certification): CoursePackageDocument {
  const domains = content.domains.filter(domain => domain.certId === cert.id);
  const lessons = content.lessons.filter(lesson => lesson.certId === cert.id);
  const units = domains.map(domain => ({
    id: domain.id,
    title: domain.name,
    description: domain.description,
    lessons: lessons.filter(lesson => lesson.domain === domain.id).map(lesson => {
      const activityId = `${lesson.id}:instruction`;
      return {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.sections[0]?.body ?? lesson.title,
        objectives: lesson.objectives,
        activities: [{
          id: activityId,
          type: "instruction",
          title: `Study ${lesson.title}`,
          estimatedMinutes: lesson.estMinutes,
          body: lessonBody(lesson),
          objectiveIds: lesson.objectiveId ? [lesson.objectiveId] : [],
          source: location(domain.id, lesson.id, activityId),
          required: true
        }]
      };
    })
  }));
  const readings = units.flatMap(unit => unit.lessons.map(lesson => ({
    id: `${lesson.id}:reading`,
    title: lesson.title,
    body: lesson.activities[0]?.body ?? lesson.summary,
    source: location(unit.id, lesson.id, lesson.activities[0]?.id ?? ""),
    unitId: unit.id,
    lessonId: lesson.id,
    required: true
  })));
  return {
    manifest: {
      format: "skillforge-course",
      formatVersion: 1,
      packageId: `builtin.${cert.id}`,
      packageVersion: "1.1.0",
      courseId: cert.id,
      courseVersion: "1.1.0",
      contentVersion: contentRevision(content),
      title: cert.name,
      description: cert.description,
      publisher: "SkillForge",
      authors: ["SkillForge contributors"],
      license: "Apache-2.0",
      capabilities: ["instructor", "readings"],
      visibilityMetadata: { audience: "public", builtIn: true },
      provenance: { source: "built-in", signatureStatus: "unsigned" }
    },
    course: {
      id: cert.id,
      title: cert.name,
      description: cert.description,
      subtitle: `${cert.vendor} ${cert.shortName} authored study track`,
      subject: cert.name,
      type: "certification",
      level: "beginner",
      audience: ["independent learner"],
      outcomes: [`Explain the authored concepts in the ${cert.name} study track.`, "Use the existing practice workspace to test recall."],
      estimatedTotalMinutes: units.reduce((sum, unit) => sum + unit.lessons.reduce((inner, lesson) => inner + lesson.activities[0].estimatedMinutes, 0), 0),
      units,
      prerequisites: [],
      placement: { description: "Start with the first available unit; placement is advisory and never changes mastery." },
      metadata: { source: "public-certification-content", formalAssessmentAuthority: "certification-practice-workspace" }
    },
    instructor: {
      id: "skillforge-instructor",
      displayRole: "Course Instructor",
      subjectScope: cert.name,
      pedagogicalInstructions: ["Stay within the authored course material.", "Use deterministic fallback language when no provider is configured.", "Never grant mastery or alter academic progress."],
      allowedModes: ["TEACH", "CLARIFY", "EXPLAIN_DIFFERENTLY", "HINT", "SOCRATIC", "RECAP"],
      fallbackLanguage: "Use the authored lesson, state the evidence, and identify the next practice step."
    },
    readings
  };
}

export function buildPublicPackages(content: ContentBundle): CoursePackageDocument[] {
  return content.certifications.filter(cert => cert.status !== "coming-soon").map(cert => buildPublicCoursePackage(content, cert));
}
