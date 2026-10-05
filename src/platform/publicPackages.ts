import type { Certification, Lesson } from "../types";
import type { ContentBundle } from "../content/validate";
import { contentRevision } from "../content/revision";
import type { Course, CourseAssessment, CourseLesson, CourseModule, RemediationActivity, TeachingActivity } from "../course/types";
import type { CoursePackageDocument } from "./packageTypes";

function lessonBody(lesson: Lesson): string {
  return lesson.sections.map(section => [section.heading, section.body, ...(section.bullets ?? [])].filter(Boolean).join("\n")).join("\n\n");
}

function emptyAssessment(id: string, title: string): CourseAssessment {
  return { id, title, activityIds: [], passScore: 1, description: "No separate authored assessment is declared for this public certification lesson projection." };
}

function makeCourse(content: ContentBundle, cert: Certification): Course {
  const domains = content.domains.filter(domain => domain.certId === cert.id);
  const lessons = content.lessons.filter(lesson => lesson.certId === cert.id);
  const modules: CourseModule[] = domains.map(domain => ({
    id: domain.id,
    title: domain.name,
    summary: domain.description,
    learningOutcomes: domain.topics,
    prerequisiteModuleIds: [],
    prerequisiteConceptIds: [],
    lessons: lessons.filter(lesson => lesson.domain === domain.id).map((lesson): CourseLesson => {
      const activityId = `${lesson.id}:instruction`;
      const remediationId = `${lesson.id}:remediation`;
      const instruction: TeachingActivity = {
        id: activityId,
        type: "instruction",
        title: `Study ${lesson.title}`,
        estimatedMinutes: lesson.estMinutes,
        body: lessonBody(lesson),
        keyPoints: lesson.objectives,
        objectiveIds: lesson.objectiveId ? [lesson.objectiveId] : [],
        required: true
      };
      const remediation: RemediationActivity = {
        id: remediationId,
        type: "remediation",
        title: `Review ${lesson.title}`,
        estimatedMinutes: Math.max(5, Math.ceil(lesson.estMinutes / 2)),
        body: `Revisit the authored explanation for ${lesson.title}.`,
        practicePrompt: "State the key idea in your own words before returning to the lesson.",
        returnToActivityId: activityId,
        successSignal: "Learner can explain the authored objective without prompting.",
        required: false
      };
      return {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.sections[0]?.body ?? lesson.title,
        objectives: lesson.objectives,
        estimatedMinutes: lesson.estMinutes,
        conceptIds: lesson.objectiveId ? [lesson.objectiveId] : [],
        activities: [instruction, remediation],
        masteryRule: { gateActivityId: activityId, passScore: 1, requiredActivityIds: [activityId], retryPolicy: "remediate-then-retry" },
        remediationActivityId: remediationId,
        references: [],
        tags: [cert.shortName]
      };
    }),
    estimatedMinutes: lessons.filter(lesson => lesson.domain === domain.id).reduce((sum, lesson) => sum + lesson.estMinutes, 0),
    masteryRequirements: domain.topics
  }));
  const totalMinutes = modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  return {
    id: cert.id,
    version: "1.3.0",
    contentVersion: contentRevision(content),
    title: cert.name,
    subtitle: `${cert.vendor} ${cert.shortName} authored study track`,
    description: cert.description,
    subject: cert.name,
    level: "foundational",
    audience: "independent learner",
    prerequisites: [],
    prerequisiteConceptIds: [],
    outcomes: [`Explain the authored concepts in the ${cert.name} study track.`, "Use the existing practice workspace to test recall."],
    estimatedTotalMinutes: totalMinutes,
    modules,
    optionalResources: [],
    capstone: emptyAssessment(`${cert.id}:capstone`, `${cert.name} capstone`),
    finalAssessment: emptyAssessment(`${cert.id}:final-assessment`, `${cert.name} final assessment`),
    metadata: { author: "SkillForge contributors", source: "public-certification-content", tags: [cert.shortName] },
    visibility: "public",
    type: "certification"
  };
}

export function buildPublicCoursePackage(content: ContentBundle, cert: Certification): CoursePackageDocument {
  const course = makeCourse(content, cert);
  return {
    manifest: {
      format: "skillforge-course",
      formatVersion: 1,
      packageId: `builtin.${cert.id}`,
      packageVersion: "1.3.0",
      courseId: course.id,
      courseVersion: course.version,
      contentVersion: course.contentVersion,
      title: course.title,
      description: course.description,
      publisher: "SkillForge",
      authors: ["SkillForge contributors"],
      license: "Apache-2.0",
      capabilities: ["instructor", "readings", "remediation"],
      visibilityMetadata: { audience: "public", builtIn: true },
      provenance: { source: "built-in", signatureStatus: "unsigned" }
    },
    course,
    instructor: {
      id: "skillforge-instructor",
      displayRole: "Course Instructor",
      subjectScope: cert.name,
      pedagogicalInstructions: ["Stay within the authored course material.", "Use deterministic fallback language when no provider is configured.", "Never grant mastery or alter academic progress."],
      allowedModes: ["TEACH", "CLARIFY", "EXPLAIN_DIFFERENTLY", "HINT", "SOCRATIC", "RECAP"],
      fallbackLanguage: "Use the authored lesson, state the evidence, and identify the next practice step.",
      fallbackContext: "Public certification content is bounded to the authored course and existing practice workspace."
    }
  };
}

export function buildPublicPackages(content: ContentBundle): CoursePackageDocument[] {
  return content.certifications.filter(cert => cert.status !== "coming-soon").map(cert => buildPublicCoursePackage(content, cert));
}
