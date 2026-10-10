# WI-327 — Reachable Lab Completion and Persistent Lab Runs

> **Status:** Proposed
> **Owner:** Labs runtime contributor; persistence integration owner approves shared-contract changes.
> **Depends on:** WI324.

## Scope and ownership

Make authored lab completion reachable after reflection and persist valid lab-run state through the canonical envelope. Own `src/labs/**`, its learner completion UI, and public-neutral tests. Preserve deterministic authored checks and prevent automatic pass paths.

Use WI324's public mutation API and reserved lab slot. Do not create another learner-state authority, edit the envelope owner without the integration contract, or add network/executable lab capabilities. Keep package identity and migration concerns with WI329.

## Start and review gates

This item remains proposed until its own readiness decision and WI324 are complete/stable. Use an isolated branch, neutral public fixtures, validation-failure and restart tests, accessibility checks, and independent review. Before editing a protected shared path, satisfy Gate O in `governance/execution-roadmap.md` against the then-current main contract. Follow WI311 policy for authored-content changes; real learner pilot work remains gated by WI333/WI228. These scope-specific gates do not add blanket prerequisites for the lab-runtime work described here. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
