# WI-326 — Persistent Lecture Delivery State

> **Status:** Proposed
> **Owner:** Lecture runtime contributor; persistence integration owner approves shared-contract changes.
> **Depends on:** WI324.

## Scope and ownership

Persist the lecture cursor, visited segments, responses, and completion through the canonical envelope so state survives restart. Own lecture delivery state in `src/lecture/persistence.ts`, `src/lecture/**`, and focused public tests. WI322 owns formal activity resolution/evaluation; WI326 must not change that contract without the WI322 owner’s decision and the applicable integration gate.

Use WI324's public mutation API. Do not add a second lecture store, write directly to the envelope, change CourseProgress authority or capstone semantics, or edit the shared persistence owner without the integration owner's explicit contract and review.

## Start and review gates

This item remains proposed until its own readiness decision and WI324 are complete/stable. Use an isolated branch, neutral public fixtures, restart/namespace/failure tests, and independent review. Before editing a protected shared path, satisfy Gate O in `governance/execution-roadmap.md` against the then-current main contract. Follow WI311 policy for any authored-content changes; real learner pilot work remains gated by WI333/WI228. These scope-specific gates do not add blanket prerequisites for the lecture-state work described here. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
