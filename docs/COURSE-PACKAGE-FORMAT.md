# SkillForge Course Package V1.2

The canonical public contract is [skillforge-course-v1.schema.json](../schemas/skillforge-course-v1.schema.json). Contract-owned objects use strict unknown-field rejection; package extensions belong only in `extensionMetadata`.

The contract carries the complete authored hierarchy, rich activity and mastery
fields, lecture segment kinds, academic catalog records, instructor
configuration, and deterministic lab state-machine data. Lab effects preserve
`set`, `increment`, and `append`; formal-activity steps retain their activity
identity.

## Package shape

```text
CoursePackageDocument
  manifest                 identity, versions, capabilities, provenance
  course                   identity, metadata, modules, lessons, activities,
                           mastery rules, capstone, final assessment
  lectures?                explicit lecture definitions and segment sequence
  instructor?              bounded fallback profile
  academic?                syllabus, readings, assignments, assessments
  labs?                    bounded authored lab state machines
  assets?                  validated package-owned references
  migrations?              update guidance
  extensionMetadata?       uninterpreted package extension data
```

`course` is the canonical authored learning hierarchy. Readings, assignments,
and academic assessments live under `CoursePackageDocument.academic`; lecture
definitions live under `.lectures`; labs live under `.labs`; and the instructor
profile lives under `.instructor`. These are sibling package catalogs, not
optional fields nested inside `Course`.

The manifest is the install boundary. `packageId` identifies the package,
`courseId` identifies the authored course, `packageVersion` identifies the
transported package, and `courseVersion`/`contentVersion` identify the authored
content. These values are not learner progress keys; the runtime derives a
stable progress namespace from the course identity and preserves existing
state through compatible updates.

`capabilities` declares package intent and supported feature classes. Capability
names are validated against `PACKAGE_CAPABILITIES`, unsupported executable or
network capabilities are rejected before installation, and each authored
catalog is validated independently when present. Lecture, Academic, and Labs
surfaces are exposed from their validated authored catalogs. The instructor
runtime always has a deterministic provider-neutral fallback and optionally
uses `.instructor` to customize it. Remediation is part of the canonical
`Course` activity/progress model, not a sibling package catalog. Capabilities
remain descriptive metadata rather than UI activation switches.

## Activity identity

An authored activity is located by the tuple:

```text
moduleId + lessonId + activityId
```

Lecture segments that render a formal activity must carry both
`sourceLocation` and `sourceActivityId`, and those fields must resolve to the
same activity in `course.modules[].lessons[].activities[]`. This prevents a
lecture from displaying one activity while writing evidence for another.

The formal lecture segment kinds are:

| Segment kind | Runtime behavior |
| --- | --- |
| `GUIDED_PRACTICE` | Shared authored activity surface with guided response |
| `INDEPENDENT_PRACTICE` | Shared surface with transfer/scenario response |
| `ASSESSMENT` | Shared surface evaluated by the course mastery runtime |
| `REMEDIATION` | Exact failure-targeted review that returns to retry |

Interactive lecture segments are `PAUSE_AND_PREDICT`, `SOCRATIC_QUESTION`, and
`KNOWLEDGE_CHECK`. Informational lecture segments are `OPENING`, `LECTURE`,
`EXPLANATION`, `DIAGRAM`, `WORKED_TRACE`, `CODE_WALKTHROUGH`,
`DEMONSTRATION`, `RECAP`, and `CLOSING`. They remain authored lecture sequence
content and do not create a second activity record. Their completion is tracked
by the lecture run while formal activity completion is tracked by
`CourseProgress`.

## Progress and package portability

Learner state is never embedded in `.skillforge-course`. The platform envelope
stores package identity metadata and namespaced `CourseProgress` separately.
This allows a package to be exported, validated, and transferred without
leaking learner history or conflating two courses with similar titles.

When package content moves between versions, use `migrations` to declare
whether state can be preserved, must be reset, or needs manual review. A
migration declaration does not silently rewrite learner data; the persistence
boundary remains explicit.

Schema SHA-256: `71340ca69d1b7cc271ecbfb59a53ea1898255def20e840e2fbc9a3d1b74fe697`.

Version fields use strict major.minor.patch grammar with optional prerelease identifiers. Registry updates compare numeric core versions and prereleases semantically.
