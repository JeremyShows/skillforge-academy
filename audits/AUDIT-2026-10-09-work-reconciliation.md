# AUDIT-2026-10-09-work-reconciliation: Canonical Work Inventory and Gated Execution

Type: foundation / architecture
Status: open
Date: 2026-10-09
Auditor: Codex
Related Todo: [WI332](../work/active/332-canonical-work-reconciliation-and-gated-execution-plan/README.md)

## Scope

Reconcile RepoPact records, public worktrees/branches, pull requests, WI323
registration, WI312 privacy dependencies, WI310 candidate evidence, WI322
implementation/closeout, WI325–WI329 boundaries, and WI331 release-stage
dependencies. No feature implementation, package/install operation, private
course material, or learner data was changed.

## Context

The first freshly fetched discovery baseline was `17be629702ef57ffd38db35c5d541745f02e73b0`.
While this work proceeded, PR #14 and WI330 closeout PR #15 merged; `origin/main`
advanced to `e46d4227117a6a0a16bcb41430cfe429a82de880`. The governance branch was
rebased onto that head. The shared checkout was dirty on `local/interview-lab`,
so governance edits remain isolated in a separate worktree.

## Method

- Read `AGENTS.md`, RepoPact decisions 0007–0011, schemas, governance policy,
  every canonical work-item JSON, relevant active/proposed READMEs, architecture
  docs, and linked evidence.
- Inspected local public branches/worktrees, the WI323 candidate worktree,
  remote heads, commit ancestry, and GitHub PRs #1–#15, including the merges
  that landed during reconciliation.
- Found five commits ahead of canonical main on the dirty `local/interview-lab`
  checkout; its modified and untracked interview-app files were left untouched.
  The WI323 candidate worktree contains only its proposal and dashboard drift;
  WI324/WI330 worktree heads are merged ancestors. The WI330 worktree's
  untracked `.venv/` was preserved.
- Verified WI322 commits `846cc19` and `762837f` are ancestors of current main;
  inspected bridge source, the evidence run, focused tests, browser acceptance,
  and privacy scan. No WI322 PR or independent closeout record was found.
- Compared WI323's original proposal and preflight with the copied record; no
  WI323 source implementation or evidence was found.
- Inspected RepoPact 3.0.2 capabilities before editing the graph; no Core or
  validator change was needed.
- Final commands are recorded in evidence run
  `20261009-332-work-reconciliation`.

## Findings

### P1: Pilot privacy safeguards were sequenced after learner participation

Status: Resolved in this PR's proposed dependency graph.
Evidence: WI312 depended on WI228, while WI228 had no pre-pilot privacy gate.

Recommendation:

- Split the pilot subset into WI333, make WI228 depend on WI333, and remove
  WI228/WI310 dependencies from WI312. Keep future institutional, hosted, and
  minor-data architecture in WI312. Make no compliance claims.

### P2: WI323 scope was accepted but absent from canonical main

Status: Registration prepared in this PR; canonical status remains proposed.
Evidence: Original record in `ux-follow-up-candidate` at `72a8ecb`, including
the October 6 preflight and five pending criteria.

Recommendation:

- Register the original proposal without replacement or completion claims.
  Keep it proposed until WI314 and WI322 entry conditions pass.

### P2: WI322 implementation is on main but review/closeout evidence is incomplete

Status: Open.
Evidence: Bridge source commits `846cc19` and `762837f` are ancestors of
`e46d422`; `20261005-322-lecture-formal-activity-bridge` records focused tests,
browser acceptance, privacy scan, and local gates. Its captured review boundary
was pre-review. No WI322 pull request or independent closeout record was found.
All work-item criteria remain pending.

Recommendation:

- Keep WI322 active and obtain independent review plus current-main acceptance
  evidence before closeout. Do not infer completion from source or architecture
  documentation alone.

### P2: WI310 evidence is candidate-specific and operational readiness is open

Status: Clarified in WI310 documentation; candidate gate remains open.
Evidence: WI310 AC-4 has no evidence; AC-3 is waived with its recorded GitHub
billing blocker. The retained artifact is `1.4.1-beta.1` at commit
`ca6d5b6d11741b3d7fc2890976ee5005c330b735`.

Recommendation:

- Retain its old identity/hash as historical. Require a new exact binary, hash,
  CI, installed-app, migration, and privacy packet for any v2 candidate.

### P2: WI331's blanket dependencies blocked harmless preparation

Status: Dependency correction proposed in this PR; WI331 remains proposed and
its six acceptance criteria are unchanged.
Evidence: Merged WI331 listed 310, 311, 322, 324–330 while combining
preparation, candidate verification, and publication.

Disposition:

- Narrow the RepoPact dependency to completed WI330 so harmless preparation can
  proceed. Put candidate-verification and publication entry conditions in the
  WI331 README, including exact-candidate evidence and explicit authorization.
- Preserve WI310's historical candidate evidence; no candidate or publication
  acceptance is claimed.

## P2: Branch-local course and persistence implementation overlaps planned ownership

**Status:** Remediated in this PR's governance plan; effective on canonical main
only after PR #16 and its separate WI332 closeout merge. No implementation was
integrated, and the source branch remains untouched.

**Evidence:** `local/interview-lab` is at `cbc4dcd79a67fd589d4251cef82bed1c8064264c`.
Its common ancestor with the review baseline is `687dfbb85234b0863f5c80f790d9c0e0d7280cb4`; at review, `origin/main` was `e46d4227117a6a0a16bcb41430cfe429a82de880`, 57 commits ahead of the branch and 5 commits behind it. The working tree has no staged changes, eight modified tracked files, and one untracked file. The independent review finding was correct: course progress, learner state, and course styles overlap WI322/WI325/WI329 surfaces.

**Semantic comparison:** The branch's versions of `src/course/progress.ts` and
`src/course/types.ts` remove capstone-stage, module-assessment, academic-mastery,
and assessment-evidence state that exists on review `origin/main`. Its
`src/state/learnerState.ts` is a distinct browser/Tauri store and lacks the
canonical-main `importLearnerBackupAtomically` and `importLegacyLearnerState`
entry points. Its Tauri changes add another course-state command path. These are
not drop-in implementations of WI322, WI325, WI324, or WI329. Merging or copying
them wholesale could regress current course and learner-backup contracts.

**Disposition:** Preserve all five committed changes and all uncommitted files
on the original branch. Do not merge, rebase, cherry-pick, stage, or transfer
implementation under WI332. WI322/WI325/WI329 must use a clean branch from
refreshed canonical main and the Gate O contract in
[`governance/execution-roadmap.md`](../governance/execution-roadmap.md#source-ownership-and-integration-gate).
No new dependency edges are introduced. The standalone interview academy has no
canonical owning WI; if maintainers later authorize public productization,
register a new scoped proposed WI rather than expanding the narrower WI322,
WI325, or WI329 criteria. Commit-by-commit capabilities, exact path lists,
working-tree inventory, classification, and required evidence are recorded in
[`the branch reconciliation report`](../evidence/platform/2026-10-09-wi332-local-interview-lab-reconciliation.md).

The fresh ownership review also found that this PR initially added blanket
WI311/WI322/WI332/WI333 prerequisites to WI326–WI328, although their
`origin/main` records depended only on WI324. The PR branch restores WI324 as
their sole direct prerequisite and makes Gate O conditional on edits to a
protected shared path. Authored-content policy, formal-activity ownership, and
real-pilot safeguards remain binding only when that scope is entered; they do
not block disjoint synthetic/runtime work. This correction changes planning
records only and does not start WI326–WI328 implementation.

**Required evidence before overlapping implementation:** named maintainer and
source-workstream owner decision; exact current-main SHA and file/API contract;
public-safe course/evaluator scope; synthetic progress and backup migration
fixtures; tests for existing capstone/assessment/resume behavior and legacy
backup recovery; accessibility/build/Rust validation for the touched surface;
and independent review. The gate protects shared files only and does not add
blocking dependencies to disjoint work.

## Evidence

```text
Discovery baseline: 17be629702ef57ffd38db35c5d541745f02e73b0
Rebased origin/main: e46d4227117a6a0a16bcb41430cfe429a82de880
PR #14 (WI330 docs) and PR #15 (WI330 governance closeout): merged
WI330: completed with eight satisfied criteria and linked evidence
WI331: canonical proposed item; preparation dependency narrowed to WI330
WI324 PR #12 and PR #13: merged; WI324 complete on main
WI332 PR #16: open; no reviewer request because only collaborator is its author
RepoPact 3.0.2: dependency, cycle, lifecycle, and evidence validation available
Full inventory and execution map: governance/execution-roadmap.md
```

## Risks

- WI322 source is already in main without a found PR/review closeout reference;
  verify its current-main behavior before shared activity surfaces expand.
- WI310 remains active and WI228 deferred until its exact candidate gate is
  dispositioned and WI333 is complete.
- WI331 remains a proposal without candidate evidence. Phase-specific gates are
  recorded in its README; they must be honored even though RepoPact's simple
  dependency edge allows preparation to start.
- The checked active GitHub ruleset requires no PR review or approval; it only
  blocks deletion and non-fast-forward updates. The collaborator list contains
  only the PR author, so no non-author collaborator is available. Codex's
  independent technical review is not GitHub approval. Recheck the active
  ruleset before merge; no formal approval gate is currently mandatory.
- RepoPact does not encode stage gates, release phases, owner boundaries, or
  work-item supersession. The human execution map is a required operating record.

## Actions

- [ ] Obtain independent review of the ownership-gate correction, then complete the protected-branch closeout.
- [x] Inventory and preserve the local interview-lab branch and its uncommitted work; publish Gate O without importing code.
- [ ] Review and close WI322 before WI323 or any formal-activity contract change.
- [ ] Complete WI311 before governed authored-content expansion and WI333
      before WI228/real-learner pilot scope; these are not blanket prerequisites
      for WI326–WI328's WI324-scoped work.
- [ ] Keep WI331 candidate verification blocked until its claimed runtime and
  privacy prerequisites have evidence; keep publication behind explicit
  maintainer authorization.
- [ ] Keep WI228 deferred until WI310 and WI333 are evidenced complete.

## Final Status

Open. The governance plan is reviewable, but this PR and its separate WI332
closeout, WI322 review, WI311, WI333, and WI310 packaged acceptance remain
outstanding. WI331 remains proposed with no candidate evidence.
