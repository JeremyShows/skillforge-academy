import type { Course, CourseActivity, CourseLocation } from "../course/types";
import { DEFAULT_LECTURE_VERSION, LECTURE_CATALOG_VERSION, type LectureAuthoredContent, type LectureCatalog, type LectureDefinition, type LectureSegment, type LectureSegmentType } from "./types";

export function lectureIdForLesson(courseId: string, lessonId: string): string { return `lecture:${courseId}:${lessonId}`; }
function activityType(activity: CourseActivity): LectureSegmentType {
  if (activity.type === "instruction") return "LECTURE";
  if (activity.type === "concept_explanation") return "EXPLANATION";
  if (activity.type === "worked_example") return "DEMONSTRATION";
  if (activity.type === "guided_practice") return "GUIDED_PRACTICE";
  if (activity.type === "remediation") return "REMEDIATION";
  if (activity.type === "mastery_check" || activity.type === "module_assessment" || activity.type === "capstone_activity") return "ASSESSMENT";
  if (activity.type === "no_notes" || activity.type === "reflective_prompt") return "PAUSE_AND_PREDICT";
  if (activity.type === "explain_back" || activity.type === "interview_drill") return "SOCRATIC_QUESTION";
  return "KNOWLEDGE_CHECK";
}
function location(moduleId: string, lessonId: string, activityId: string): CourseLocation { return { moduleId, lessonId, activityId }; }
function content(activity: CourseActivity): LectureAuthoredContent | undefined {
  if ("body" in activity && activity.body) return { kind: "prose", paragraphs: activity.body.split(/\n\n+/).filter(Boolean).slice(0, 6) };
  return undefined;
}
export function buildLectureCatalog(course: Course): LectureCatalog {
  let number = 1;
  const lectures: LectureDefinition[] = course.modules.flatMap(module => module.lessons.map(lesson => ({
    id: lectureIdForLesson(course.id, lesson.id), version: DEFAULT_LECTURE_VERSION, courseId: course.id, moduleId: module.id,
    lessonIds: [lesson.id], number: number++, title: lesson.title, abstract: lesson.summary, objectives: lesson.objectives,
    prerequisiteConceptIds: lesson.prerequisiteKnowledge ?? [], estimatedMinutes: lesson.estimatedMinutes, references: lesson.references ?? [], tags: lesson.tags,
    explicit: false, segments: lesson.activities.map(activity => {
      const type = activityType(activity);
      const interactive = ["PAUSE_AND_PREDICT","SOCRATIC_QUESTION","KNOWLEDGE_CHECK"].includes(type);
      return { id: `segment:${lesson.id}:${activity.id}`, type, title: activity.title, conceptIds: lesson.conceptIds ?? lesson.objectives,
        authoredContent: content(activity), sourceActivityId: activity.id, sourceLocation: location(module.id, lesson.id, activity.id),
        prompt: "prompt" in activity ? activity.prompt : undefined, expectedInteraction: interactive ? type === "PAUSE_AND_PREDICT" ? "prediction" : type === "SOCRATIC_QUESTION" ? "question" : "free-response" : "none",
        references: lesson.references ?? [], estimatedMinutes: activity.estimatedMinutes, required: activity.required !== false };
    })
  })));
  return { courseId: course.id, version: LECTURE_CATALOG_VERSION, lectures, explicitLectureIds: [] };
}
export function lectureForLesson(catalog: LectureCatalog, lessonId: string): LectureDefinition | undefined { return catalog.lectures.find(lecture => lecture.lessonIds.includes(lessonId)); }
export function lectureForLocation(catalog: LectureCatalog, location: CourseLocation): LectureDefinition | undefined { return catalog.lectures.find(lecture => lecture.moduleId === location.moduleId && lecture.lessonIds.includes(location.lessonId)); }
export function lectureActivityLocations(lecture: LectureDefinition): CourseLocation[] { return lecture.segments.flatMap(segment => segment.sourceLocation ? [segment.sourceLocation] : []); }

