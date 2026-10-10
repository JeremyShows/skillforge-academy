# WI-326 — Persistent Lecture Delivery State

> **Status:** Proposed
> **Owner:** Lecture runtime contributor; persistence integration owner approves shared-contract changes.
> **Depends on:** WI311, WI322, WI324, WI332, and WI333.

## Scope and ownership

Persist the lecture cursor, visited segments, responses, and completion through the canonical envelope so state survives restart. Own lecture delivery state in `src/lecture/persistence.ts`, `src/lecture/**`, and focused public tests. WI322 owns formal activity resolution/evaluation and must close before WI326 changes the lecture state contract.

Use WI324's public mutation API. Do not add a second lecture store, write directly to the envelope, change CourseProgress authority or capstone semantics, or edit the shared persistence owner without the integration owner's explicit contract and review.

## Start and review gates

This item remains proposed until WI332's governance gate, WI311, WI322, WI333, and WI324 are complete/stable. Use an isolated branch, neutral public fixtures, restart/namespace/failure tests, and independent review. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
