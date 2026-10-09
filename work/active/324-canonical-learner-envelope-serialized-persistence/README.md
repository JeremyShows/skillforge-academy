# WI-324 — Canonical Learner Envelope and Serialized Persistence

> **Status:** Active
> **Base:** `927a57c9119d24581e8fe3fc1f1bd68e7ab1d0af`
> **Branch:** `codex/wi324-canonical-envelope-persistence`

## Intent

Make `PlatformLearnerEnvelope` the single hydrated, serialized, durability-aware owner for generic course-platform learner state. `CourseProgress` remains the academic authority, and Academic Record remains a projection from authored catalog data and CourseProgress.

## Scope

- Add one envelope owner with hydration readiness, sanitized snapshots, serialized mutations, durable acknowledgments, failure reporting, and bounded flush.
- Route PlatformHub state through that owner and prevent learner mutation before hydration.
- Serialize and protect native platform-state file writes.
- Preserve schema-1 course entries and data; define a migration boundary without migrating legacy certification state.
- Test ownership, ordering, failure, compatibility, and CourseProgress regressions with neutral public fixtures.

## Explicitly deferred

- WI325: capstone stage context, stage-specific evaluation, evidence commit, and Academic Record parity.
- WI326: persisted lecture delivery state.
- WI327: reachable lab completion and persisted lab runs.
- WI328: native Windows encrypted backup and restore.
- WI329: legacy certification runtime and feature parity, including actual legacy-state migration.
- WI323: learner UX candidate in its separate worktree.

No private course or private fixture, installed application, release installer, or preserved learner-state backup is in scope.
## Progress

All WI324 implementation criteria are satisfied by the public-safe evidence packet at evidence/platform/2026-10-09-wi324-canonical-envelope-persistence/README.md. The work item remains active and stops for independent review; it is not merged or installed.
