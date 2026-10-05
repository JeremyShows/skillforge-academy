# Canonical authored model field matrix

The authored runtime types are authoritative. Package transport aliases point to those types and do not define a second private schema.

| Surface | Authored source | Package treatment | Runtime state excluded |
|---|---|---|---|
| Course | `src/course/types.ts` `Course` | exact `Course` object; `modules` is authoritative | `CourseProgress`, session and outcome state |
| Module | `CourseModule` | exact module fields, including outcomes, prerequisites, lessons and assessment | module progress/status |
| Lesson | `CourseLesson` | exact lesson fields, mastery rule, activity list and remediation link | lesson progress and review queue |
| Activity | `CourseActivity` closed union | exact subtype fields; unknown `type` rejects | activity completion/outcome state |
| Instruction block | `InstructionBlock` closed union | exact block variants; unknown `type` rejects | rendered UI state |
| Mastery | `MasteryRubric` / `MasteryCriterion` | full authored criteria and deterministic signals | criterion results |
| Assessment | `CourseAssessment` | full authored assessment and stages | attempts/results |
| Lecture | `LectureCatalog` and `LectureDefinition` | direct catalog; full segment/content union | lecture run, notes and bookmarks |
| Academic | `AcademicCatalog` | direct catalog; authored policy and relationship semantics | engagement/status records |
| Instructor | package profile plus canonical `InstructorMode` | identity, scope, instructions, modes and fallback language/context | provider credentials/configuration |
| Labs | `LabCatalog` and `LabDefinition` | direct declarative catalog | lab run/history/observations |

`formatVersion: 1` remains the controlled pre-release package envelope version. The authored model version is carried by `course.version` and `course.contentVersion`.
