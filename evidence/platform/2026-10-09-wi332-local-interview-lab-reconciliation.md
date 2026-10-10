# WI332 — `local/interview-lab` ownership reconciliation

**Review baseline:** `origin/main` `e46d4227117a6a0a16bcb41430cfe429a82de880`
**Local branch:** `local/interview-lab` at `cbc4dcd79a67fd589d4251cef82bed1c8064264c`
**Common ancestor:** `687dfbb85234b0863f5c80f790d9c0e0d7280cb4`
**Disposition:** preserve-only; no implementation transfer or integration authorized by WI332.

## Inspection boundaries

The checkout was inspected read-only. No checkout, reset, clean, rebase, stash,
cherry-pick, stage, commit, or file transfer was performed there. No private
authored course content or learner data was opened or accessed. The course
content module is recorded by path only. No implementation tests were run on
the local branch.

At inspection, `origin/main...HEAD` was `57 5`: current main had 57 commits not
in the local branch, and the local branch had five commits not in main. Its
working tree had no staged changes, eight modified tracked files, and one
untracked file. The status is a point-in-time inventory, not ownership or scope
acceptance.

## Five-commit traceability

| Commit and subject | Capability and classification | Exact committed paths | Existing WI / ownership | Disposition and evidence required before any public integration |
| --- | --- | --- | --- | --- |
| `ae1e18d5a886774dfe575c95295d97241785b53e` — `feat(interview-lab): checkpoint private ForgeWire interview academy` | Establishes an interview academy app shell, evaluator/session components and tests, plus native/local evaluator support. Unique committed branch work; no canonical acceptance record found. | `.gitignore`; `scripts/forgewire-evaluator-smoke.local.ts`; `scripts/interview-model-qualification.qualify.ts`; `scripts/local_forgewire_provider_bridge.py`; `scripts/provider-high-priority-smoke.local.ts`; `scripts/provider-qualification.qualify.ts`; `scripts/start_local_forgewire_provider_bridge.ps1`; `scripts/vitest.interview-qualification.config.ts`; `src-tauri/Cargo.lock`; `src-tauri/Cargo.toml`; `src-tauri/gen/schemas/acl-manifests.json`; `src-tauri/gen/schemas/capabilities.json`; `src-tauri/gen/schemas/desktop-schema.json`; `src-tauri/gen/schemas/windows-schema.json`; `src-tauri/src/lib.rs`; `src/App.tsx`; `src/InterviewLab.tsx`; `src/content/index.ts`; `src/interview/IncidentDiagnostics.tsx`; `src/interview/NoNotesInterview.tsx`; `src/interview/evaluator.test.ts`; `src/interview/evaluator.ts`; `src/interview/goldenCorpus.test.ts`; `src/interview/goldenCorpus.ts`; `src/interview/rubric.ts`; `src/interview/session.test.ts`; `src/interview/session.ts`; `src/styles.css`; `src/types.ts`; `vite.config.ts`. | No existing WI governs the standalone interview academy or local evaluator. WI321 is exposure remediation, not feature authorization; WI322 does not authorize a new evaluator. | Preserve on source branch. A future public productization request needs its own accepted scope, original/public-safe assessment content, evaluator/privacy/security review, and native-command tests. Local scripts/configuration are not transferred. |
| `b982a9c5e266ae251de900562b6b40220a0fe646` — `feat(interview-lab): deepen senior principal interview training` | Adds advanced training flow, academy/session logic, rubric-oriented UI and tests. Unique branch implementation; acceptance and release status are not evidenced by a canonical WI. | `src/InterviewLab.tsx`; `src/interview/AdvancedAcademy.tsx`; `src/interview/academy.test.ts`; `src/interview/academy.ts`; `src/interview/academySession.test.ts`; `src/interview/academySession.ts`; `src/styles.css`; `src/types.ts`. | No existing WI. The scope is not the formal lecture-activity bridge in WI322 or the capstone projection work in WI325. | Preserve on source branch. If desired for the public product, create a new proposed WI with content-originality, privacy, evaluator-contract and accessibility criteria. |
| `eb6eec439de7a8f7461fa98af8f990e61be5afdd` — `feat(skillforge): build course-first learning experience` | Adds a standalone course workspace, course/activity model, progress transitions and progression tests, together with a private authored-course module. The progress implementation is unique to the branch but is an alternative to current-main contracts. | `src/App.tsx`; `src/course/CourseWorkspace.tsx`; `src/course/course.css`; `src/course/course.test.ts`; `src/course/privateInterviewCourse.ts` (path only; contents not inspected); `src/course/progress.test.ts`; `src/course/progress.ts`; `src/course/types.ts`. | WI320 completed the canonical authored-course model; WI322 owns its accepted formal-activity bridge; WI325 owns capstone stage context/evaluation. None accepts this standalone feature or alternate runtime. | Preserve; do not replace current-main contracts. If adapting, a new scoped WI must map types and transitions to current main and prove assessment, remediation, capstone, resume and accessibility compatibility with public-safe fixtures. |
| `c59e5a18f0e35a75b4d65ce944ba228aafec3fc7` — `fix(skillforge): harden course flow and visual experience` | Revises the local progress/resume flow, UI and tests and updates the branch-local course module. This is branch-specific hardening, not proof that WI322 or WI325 is complete. | `src/App.tsx`; `src/course/CourseWorkspace.tsx`; `src/course/course.css`; `src/course/privateInterviewCourse.ts` (path only; contents not inspected); `src/course/progress.test.ts`; `src/course/progress.ts`. | No acceptance criteria in WI322/WI325 cover this standalone change. | Preserve; do not transplant. Any adapted transitions/UI require fresh contract tests against current main, including capstone/module assessment, accessibility and resume behavior. |
| `cbc4dcd79a67fd589d4251cef82bed1c8064264c` — `feat(skillforge): harden local interview academy persistence` | Adds a versioned browser/Tauri learner-state store, local course progress persistence, native persistence commands and an end-to-end script. Unique local implementation that conflicts with canonical-main persistence ownership. | `package.json`; `scripts/course-e2e.mjs`; `src-tauri/Cargo.lock`; `src-tauri/Cargo.toml`; `src-tauri/src/lib.rs`; `src/course/CourseWorkspace.tsx`; `src/course/privateInterviewCourse.ts` (path only; contents not inspected); `src/course/progress.test.ts`; `src/course/progress.ts`; `src/course/types.ts`; `src/state/learnerState.test.ts`; `src/state/learnerState.ts`. | WI324 owns the canonical learner envelope; WI329 is future legacy-certification adaptation; WI328 is bounded native backup/restore. None authorizes another platform persistence owner or certifies this local store. | Preserve; do not import or use it as WI329 migration evidence. Any new integration needs a maintainer-approved WI, synthetic migration/recovery tests, explicit `apex-state`/`.apexbackup` compatibility evidence, and review through WI324's owner. |

Commit subject/paths are Git provenance only. They do not prove an accepted
work-item owner, criterion completion, or permission to integrate. No new WI was
created. If maintainers authorize public interview-academy productization, a new
proposed WI is recommended rather than widening WI322, WI325, or WI329.

## Uncommitted work, kept separate

There were no staged changes. The eight tracked modifications were:

- `README.md`
- `docs/CODE-SIGNING.md`
- `docs/contributor-onboarding.md`
- `docs/getting-started.md`
- `src-tauri/tauri.conf.json`
- `src/App.tsx`
- `src/course/course.css`
- `src/styles.css`

One untracked path was present: `src/WindowTitleBar.tsx`.

These edits are not included in the five commits and were not committed or
transferred. The `src/course/course.css` change adds shared course-panel padding;
`src-tauri/tauri.conf.json`, `src/App.tsx`, and global styles are shell/identity
surfaces and remain under the branch-local workstream until an explicit handoff.
The remaining documentation edits are preserved as local work; their contents
were not imported into WI332.

## Semantic divergence from current main

The common ancestor is old relative to the review baseline. A three-dot diff
shows the branch's additions from that ancestor; a two-tree comparison against
current main is also required before integration.

- The branch's `src/course/types.ts` and `src/course/progress.ts` remove current-
  main `CapstoneProgress`, academic mastery/evidence, module-assessment, and
  assessment-provenance behavior. They are not interchangeable versions of
  the accepted main contract; a wholesale merge could regress capstone and
  assessment behavior.
- The branch's `src/state/learnerState.ts` is a distinct browser/Tauri store.
  Current main exposes atomic learner-backup and legacy-state import paths that
  the local version does not contain. Its Tauri changes add a separate
  course-state command path. This is not a WI324 replacement or WI329 migration.
- `src/course/course.css` contains generic `.course-*` selectors; the local
  uncommitted change widens padding to additional shared panels. Treat it as a
  shared course UI surface, not automatically isolated private styling.
- The standalone interview evaluator and course module are tied to a local
  feature branch. Their content was not opened; no claim is made about private
  content quality or acceptance.

## Worktree snapshot

- `local/interview-lab`: five commits ahead, 57 main-only commits, eight tracked
  modifications, one untracked file, nothing staged; preserved.
- `codex/governance-execution-reconciliation`: clean at PR #16 head
  `5ac4fbe8e66e910b90368d72da04dc333713fd12` at inspection.
- local `main`: clean at `927a57c`; stale relative to review `origin/main`.
- WI323 candidate worktree: detached at `72a8ecb`; preserves its dashboard
  edit and untracked WI323 proposal; untouched.
- WI324 implementation worktree: branch `codex/wi324-canonical-envelope`,
  clean at `92e93b8`; WI324 closeout worktree: detached and clean at `17be629`.
- WI330 closeout worktree: branch `codex/wi330-governance-closeout` at
  `c3df8ec`, with the pre-existing untracked `.venv/`; preserved.
- No separate WI322, WI325, or WI329 worktree was present in the enumerated
  worktree list. No private-course worktree or its files were inspected.

## Ownership and integration gate

**Decision:** preserve all five commits and all uncommitted changes on the
original branch. The current WI332 directive grants no code integration,
rebase, cherry-pick, staging, or transfer. The owner of the local workstream has
not been established in canonical work records; commit author metadata is
provenance, not a work-item assignment. The repository maintainer owns any
future integration decision; the local source-workstream owner must explicitly
hand off selected work before extraction.

**Gate entry:** before any attempt to integrate this branch or before WI322,
WI325, or WI329 modifies one of the protected shared files in the roadmap.

**Gate exit for an individual future item:** record the refreshed `origin/main`
SHA and a clean implementation branch; name the maintainer-approved item and
integration owner; define its public API/file contract against current main and
WI320/WI324; exclude private authored content and real learner data; establish
public-safe baseline tests; and pass the item's progression/assessment,
migration/recovery, accessibility, build/Rust and independent-review gates as
applicable. If no branch code is selected, keep the preserve-only disposition
and implement only the accepted WI scope on current main. WI326–WI328 and other
disjoint work are not frozen; their current RepoPact prerequisites still apply,
and they must not edit a protected surface before that surface's gate exit.

This is a human roadmap gate. RepoPact's dependency DAG remains unchanged; no
new blanket dependency was added.
