# WI-325 — Capstone Stage Context, Evaluation, and Academic Record Parity

> **Status:** Proposed
> **Owner:** Course runtime / academic feature contributor; persistence integration owner approves shared-contract changes.
> **Depends on:** WI311, WI322, WI324, and WI332.

## Scope and ownership

Carry authored stage identity from Classroom through evaluation and CourseProgress so capstone state and the Academic Record reflect the same authority. Own capstone context and projection behavior in `src/course/**`, `src/academic/**`, and focused public tests/fixtures.

WI324's `PlatformLearnerEnvelope` remains the only persistence owner. WI325 may call its published mutation API but may not add Academic Record persistence, directly read/merge/write the envelope, change migration rules, or modify private course data. Coordinate shared activity-surface layout changes with WI323; coordinate runtime semantics with WI322.

## Start and review gates

This item is proposed until WI332's governance gate, WI311, and WI322 are complete and WI324's owner contract is stable. Use an isolated branch, public-neutral fixtures, focused evaluation and retry tests, Academic Record projection checks, and independent review before merge. WI333 is the real-learner pilot privacy gate; it does not block this synthetic implementation scope. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
