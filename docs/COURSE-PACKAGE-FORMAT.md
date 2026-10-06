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
  course                   canonical units, lessons, activities, mastery rules
  lectures?                explicit lecture definitions and segment sequence
  academic?                syllabus, readings, assignments, assessments
  labs?                    bounded authored lab state machines
  instructor?              bounded fallback profile
  assets? / migrations?    validated references and update guidance
```

The manifest is the install boundary. `packageId` identifies the package,
`courseId` identifies the authored course, `packageVersion` identifies the
transported package, and `courseVersion`/`contentVersion` identify the authored
content. These values are not learner progress keys; the runtime derives a
stable progress namespace from the course identity and preserves existing
state through compatible updates.

`capabilities` is descriptive and validated against the catalogs present in
the package. Declaring a capability without its authored catalog is an invalid
or incomplete package, and declaring an unsupported executable or network
capability is rejected before installation.

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

`OPENING`, `TEACHING`, `INTERACTION`, `DISCUSSION`, `BREAK`, and `CLOSING`
remain authored lecture sequence content. They do not create a second activity
record. Their completion is tracked by the lecture run while formal activity
completion is tracked by `CourseProgress`.

## Progress and package portability

Learner state is never embedded in `.skillforge-course`. The platform envelope
stores package identity metadata and namespaced `CourseProgress` separately.
This allows a package to be exported, validated, and transferred without
leaking learner history or conflating two courses with similar titles.

When package content moves between versions, use `migrations` to declare
whether state can be preserved, must be reset, or needs manual review. A
migration declaration does not silently rewrite learner data; the persistence
boundary remains explicit.

Schema SHA-256 (2026-10-04): `2D81D5D34DE875C6EE29FAE4B34D396B596AD2456C11DDD893B69D182A41B72C`.

Version fields use strict major.minor.patch grammar with optional prerelease identifiers. Registry updates compare numeric core versions and prereleases semantically.
