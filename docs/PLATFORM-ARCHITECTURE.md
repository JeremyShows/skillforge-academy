# Platform Architecture V1.2

SkillForge Academy is an offline-first learner runtime with a declarative
course boundary. The application shell is responsible for selecting and
persisting course packages; authored packages are responsible for describing
learning content and the capabilities they have actually authored.

The platform has one source of learner truth: `CourseProgress`. Classroom,
lecture, academic, lab, and analytics surfaces derive their visible state from
that record instead of maintaining separate completion flags.

## Runtime layers

```text
PlatformHub
  CourseRegistry              validates, installs, updates, exports packages
  CourseRuntimeContext        binds the selected package to reusable modules
  PlatformLearnerEnvelope     persists package identities and namespaced state
       |
       +-- Course / CourseProgress
       +-- Classroom planner
       +-- Lecture runtime + formal activity bridge
       +-- Academic record derivation
       +-- Deterministic lab runtime
       +-- Bounded instructor fallback
```

`src/platform/PlatformHub.tsx` is the host-level composition surface. It does
not own content-specific grading rules. `src/platform/runtime.ts` delegates
activity evaluation and progress updates to the canonical course runtime.
`src/course`, `src/classroom`, `src/lecture`, `src/academic`, `src/labs`, and
`src/instructor` contain reusable domain modules.

## Package registry boundary

Every course is represented by a `CoursePackageDocument` with a manifest and an
authored `Course`. The `course` field owns course identity and metadata, modules,
lessons, activities, mastery rules, capstone, and final assessment content.
Optional sibling package sections hold lecture delivery, academic records and
readings, labs, instructor configuration, assets, and migrations. The registry:

1. validates the package format and rejects contract-owned unknown fields;
2. rejects unsupported or executable-looking capabilities before installation;
3. compares package versions semantically for updates;
4. keeps built-ins and locally imported packages distinct;
5. exports the authored package without learner state; and
6. reports identity changes to the platform persistence adapter.

The selected package is converted into a `CourseRuntimeContext`. That context
contains the package, canonical course, progress namespace, declared
capabilities, and optional authored catalogs. Manifest capabilities are
validated metadata, not surface activation switches. Lecture, Academic, and
Labs surfaces are exposed from their validated authored catalogs. Instructor
behavior always has a deterministic provider-neutral fallback; an optional
`package.instructor` profile customizes that fallback. Remediation belongs to
the canonical Course activity and CourseProgress flow rather than a sibling
catalog. The current validator validates capability names and each present
catalog independently.

## Learner state and compatibility

The platform learner envelope stores:

- installed package identity and version metadata;
- namespaced `CourseProgress` records;
- the legacy A+ learner state for compatibility; and
- the existing backup/import boundary.

Desktop persistence uses the Tauri command layer for bounded, atomic JSON
writes. Browser development uses a versioned local-storage envelope. Progress
is keyed by the runtime namespace rather than by a visible course title, so a
package update cannot silently merge unrelated learner records.

## Classroom authority

The classroom planner reads `CourseProgress.current`, completed lesson and
activity evidence, mastery rules, and retry policy. A UI action must call the
course runtime to change that record. A rendered lesson, lecture segment, or
instructor response cannot grant mastery merely by being displayed.

The same activity identity is retained across classroom and lecture surfaces:

```text
CourseLocation = moduleId + lessonId + activityId
```

This tuple is the portability boundary for activity evidence and for any
lecture segment that presents an authored activity.

## Lecture delivery

A package opts into lecture delivery with an explicit lecture catalog. The
lecture runtime owns sequence traversal, visited segments, required segments,
interaction responses, and the close condition. Formal activities are bridged
through `src/platform/lectureActivityBridge.ts`:

1. the current lecture segment must be a formal authored activity;
2. its `sourceLocation` and `sourceActivityId` must resolve to the exact course
   activity;
3. the shared `AuthoredActivitySurface` collects the learner response;
4. the course runtime evaluates and applies the response to `CourseProgress`;
5. the lecture runtime advances using the resulting authoritative progress.

The supported formal segment kinds are `GUIDED_PRACTICE`,
`INDEPENDENT_PRACTICE`, `ASSESSMENT`, and `REMEDIATION`. Interactive lecture
segments are `PAUSE_AND_PREDICT`, `SOCRATIC_QUESTION`, and `KNOWLEDGE_CHECK`.
Informational lecture segments are `OPENING`, `LECTURE`, `EXPLANATION`,
`DIAGRAM`, `WORKED_TRACE`, `CODE_WALKTHROUGH`, `DEMONSTRATION`, `RECAP`, and
`CLOSING`. These native lecture segments retain their authored advance or
response behavior.

### Remediation sequencing

Remediation is not selected by physical array order. On a failed formal
activity, the runtime selects a remediation only when both of these values
match the current authoritative progress:

- `sourceLocation` equals `CourseProgress.current` by module, lesson, and
  activity; and
- `sourceActivityId` equals `CourseProgress.current.activityId`.

The failure path enters that exact remediation. Completing remediation returns
to the failed assessment for retry. A first-attempt pass, or a passing retry,
skips remediation and advances to the next eligible authored segment. An
inactive or optional remediation is not a normal success-path destination and
does not block lecture closure.

### Completion UI

`lectureCanClose` is derived from the active required segments and
`CourseProgress`. When true, the Lecture surface renders `Lecture complete` and
does not render an `Advance authored segment` control. While incomplete,
informational and interactive segments retain the advance control, and formal
activity segments retain the shared authored activity surface. This prevents a
completed lecture from presenting an inert button or a direct bypass around a
formal activity.

## Other capability surfaces

- Academic records derive assignment and assessment state from CourseProgress
  and `package.academic`.
- Labs are bounded local state machines exposed from validated `context.labs` /
  `package.labs` data. Their actions and checks are authored data; executable
  or network-backed lab capabilities are rejected by the public runtime.
- The instructor fallback is provider-neutral and deterministic. It works
  without an instructor profile; `package.instructor` may customize it, and it
  cannot mutate learner state.
- Remediation is authored inside the canonical Course activity/progress model,
  not exposed as a sibling package catalog.
- Readings and assets remain package-owned references and are validated before
  the package becomes installable.

## Validation and evolution

Architecture or runtime changes should be proved with the smallest relevant
set of gates:

```powershell
npm test -- --run
npm run validate:content
npm run validate:a11y
npm run build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
python -m repopact_cli validate
```

Package schema changes require fixture and migration coverage. Learner-state
changes require compatibility tests. Lecture changes require both runtime tests
and browser evidence for first-pass success, fail/remediate/retry, and the
completed UI state.
