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
- Validate supported legacy/platform backup imports before replacement and commit platform imports atomically, without introducing the deferred WI328 backup/restore workflow.
- Test ownership, ordering, failure, compatibility, and CourseProgress regressions with neutral public fixtures.

## Explicitly deferred

- WI325: capstone stage context, stage-specific evaluation, evidence commit, and Academic Record parity.
- WI326: persisted lecture delivery state.
- WI327: reachable lab completion and persisted lab runs.
- WI328: native Windows encrypted backup and restore.
- WI329: legacy certification runtime and feature parity, including actual legacy-state migration.
- WI323: learner UX candidate in its separate worktree.

No private course or private fixture, installed application, release installer, or preserved learner-state backup is in scope.
## Governance closeout

The implementation and acceptance evidence merged to `main` through [PR #12](https://github.com/JeremyShows/skillforge-academy/pull/12) on 2026-10-09 (America/Chicago). The resulting implementation merge commit is `1306755f7fb95eb25fcc0d8173eda391eb2e1cdf`; the reviewed source commit is `e2758360a2b3723c78099f87ca60dd5ba88a10f8`, and the evidence commit is `92e93b89bcd176ab08bef84dd9a8cc68a9d7af8e`.

The separate read-only technical review recommended approval and reported no P1/P2 blockers. GitHub governance was checked before merge: classic branch protection was absent; the sole active default-branch ruleset (ID `24818688`, “no delete”) contains only deletion and non-fast-forward rules; no review approval or status-check rule is required. The visible `GitGuardian Security Checks` check passed. Existing merged PRs use merge commits, so PR #12 was merged through GitHub using that strategy without bypass.

This status update is in [repository governance closeout PR #13](https://github.com/JeremyShows/skillforge-academy/pull/13), based on `1306755f7fb95eb25fcc0d8173eda391eb2e1cdf`. WI324 is formally completed on `main` only when that closeout PR merges. The closeout evidence run is `20261009-324-governance-closeout`; it records the implementation merge, the current governance policy, the clean closeout branch, and RepoPact validation. No package or installation work was performed, WI322/WI323 were not modified, WI325-WI329 remain proposed, and Course Studio was not started.
