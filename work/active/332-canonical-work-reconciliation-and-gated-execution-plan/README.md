# WI-332 — Canonical Work Reconciliation and Gated Execution Plan

> **Status:** Active
> **Owner:** Governance steward; maintainers of separate workstreams retain their existing ownership.
> **Discovery baseline:** `origin/main` at `17be629702ef57ffd38db35c5d541745f02e73b0`.
> **Rebased PR base:** `origin/main` at `e46d4227117a6a0a16bcb41430cfe429a82de880`.

## Intent

Reconcile RepoPact work, local worktree-only records, and open pull requests into a dependency-correct execution map. This is governance and planning work. It does not implement WI325–WI329, take over WI330/WI331, package or install the application, publish a release, or access private course content or learner data.

The full inventory, traceability matrix, execution stages, and contributor boundaries are in [`governance/execution-roadmap.md`](../../../governance/execution-roadmap.md). The audit record is [`AUDIT-2026-10-09-work-reconciliation.md`](../../../audits/AUDIT-2026-10-09-work-reconciliation.md).

## Decisions and constraints

- WI323 is registered from its original local proposal, keeping its title, purpose, scope, preflight, five acceptance criteria, and proposed status. The maintainer accepted its scope; that does not satisfy implementation criteria. WI323 remains proposed until WI314 and WI322 entry conditions are met.
- WI333 is a distinct proposed pre-pilot privacy gate. WI228 depends on it. WI312 retains future institutional, hosted, and minor-data architecture.
- WI322 source is present on canonical main and has branch-era tests and evidence, but its recorded acceptance criteria remain pending and no independent-review closeout is linked. Its status stays active.
- PR #14 (WI330 docs) and PR #15 (WI330 governance closeout) merged while this work was in progress. WI330 is completed with AC-1 through AC-8 evidenced. WI331 is now canonical and remains proposed; this reconciliation narrows its RepoPact dependency to completed WI330 so preparation is not blocked by every platform feature. Candidate and publication entry conditions remain explicit in its README and the roadmap. No release implementation is taken over.
- `PlatformLearnerEnvelope` remains the single platform learner-state owner under decision 0011. No parallel persistence authority is introduced.
- The `local/interview-lab` checkout was reconciled read-only. Its five commits and nine uncommitted paths are preserved on the original branch; they are not implementation evidence for WI322/WI325/WI329. The old branch's course and learner-state contracts diverge from current main. Gate O in the execution roadmap requires a maintainer decision, current-main baseline, explicit ownership, and integration evidence before any overlapping source work. The detailed path inventory is in [`the reconciliation report`](../../../evidence/platform/2026-10-09-wi332-local-interview-lab-reconciliation.md).

## Closeout

PR [#16](https://github.com/JeremyShows/skillforge-academy/pull/16) is open.
The governance deliverables and repository validations are evidenced. Keep
WI332 active through independent review and the separate protected-branch
closeout. The current GitHub account is the PR author; no self-review was requested.
Independent technical review and any GitHub approval requirement are separate;
check the active ruleset before merge and do not represent a Codex review as a
human GitHub approval. Do not close WI332 from this implementation PR or treat
the plan as evidence that feature work is complete.
