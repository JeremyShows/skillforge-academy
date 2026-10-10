# WI-332 — Canonical Work Reconciliation and Gated Execution Plan

> **Status:** Active
> **Owner:** Governance steward; maintainers of separate workstreams retain their existing ownership.
> **Baseline:** `origin/main` at `17be629702ef57ffd38db35c5d541745f02e73b0`.

## Intent

Reconcile RepoPact work, local worktree-only records, and open pull requests into a dependency-correct execution map. This is governance and planning work. It does not implement WI325–WI329, take over WI330/WI331, package or install the application, publish a release, or access private course content or learner data.

The full inventory, traceability matrix, execution stages, and contributor boundaries are in [`governance/execution-roadmap.md`](../../../governance/execution-roadmap.md). The audit record is [`AUDIT-2026-10-09-work-reconciliation.md`](../../../audits/AUDIT-2026-10-09-work-reconciliation.md).

## Decisions and constraints

- WI323 is registered from its original local proposal, keeping its title, purpose, scope, preflight, five acceptance criteria, and proposed status. The maintainer accepted its scope; that does not satisfy implementation criteria. WI323 remains proposed until WI314 and WI322 entry conditions are met.
- WI333 is a distinct proposed pre-pilot privacy gate. WI228 depends on it. WI312 retains future institutional, hosted, and minor-data architecture.
- WI322 source is present on canonical main and has branch-era tests and evidence, but its recorded acceptance criteria remain pending and no independent-review closeout is linked. Its status stays active.
- WI330 and WI331 remain on open PR #14's separate branch. This work records a post-merge dependency recommendation and does not edit that branch or its records.
- `PlatformLearnerEnvelope` remains the single platform learner-state owner under decision 0011. No parallel persistence authority is introduced.

## Closeout

Keep WI332 active through independent review and the separate protected-branch closeout. Do not close it from this implementation PR or treat the plan as evidence that feature work is complete.
