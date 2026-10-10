# WI-327 — Reachable Lab Completion and Persistent Lab Runs

> **Status:** Proposed
> **Owner:** Labs runtime contributor; persistence integration owner approves shared-contract changes.
> **Depends on:** WI311, WI322, WI324, WI332, and WI333.

## Scope and ownership

Make authored lab completion reachable after reflection and persist valid lab-run state through the canonical envelope. Own `src/labs/**`, its learner completion UI, and public-neutral tests. Preserve deterministic authored checks and prevent automatic pass paths.

Use WI324's public mutation API and reserved lab slot. Do not create another learner-state authority, edit the envelope owner without the integration contract, or add network/executable lab capabilities. Keep package identity and migration concerns with WI329.

## Start and review gates

This item remains proposed until WI332's governance gate, WI311, WI322, WI333, and WI324 are complete/stable. Use an isolated branch, neutral public fixtures, validation-failure and restart tests, accessibility checks, and independent review. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
