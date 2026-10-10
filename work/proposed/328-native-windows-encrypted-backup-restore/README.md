# WI-328 — Native Windows Encrypted Backup and Restore

> **Status:** Proposed
> **Owner:** Desktop/persistence contributor; data-migration specialist reviews restore safety.
> **Depends on:** WI324.

## Scope and ownership

Provide a native Windows save/restore workflow for encrypted learner backups with truthful durability confirmation and recoverable failure behavior. Own Windows picker/command wiring, backup UX, roundtrip acceptance, and related native tests.

Use public-safe synthetic fixtures only. Restore must validate/decrypt before replacement and preserve a recoverable prior copy. WI328 may use WI324's persistence contract but must not create a second store, change legacy migration ownership, modify real learner data, or repurpose old WI221 backup evidence as proof for this new Windows path.

## Start and review gates

This item remains proposed until its own readiness decision and WI324 are complete/stable. Use an isolated branch, cancellation/invalid-destination/roundtrip/failure-preservation tests, and independent desktop/data review. Before editing a protected shared path, satisfy Gate O in `governance/execution-roadmap.md` against the then-current main contract. Use only public-safe synthetic fixtures; real learner pilot work remains gated by WI333/WI228. These scope-specific gates do not add blanket prerequisites for the native backup workflow described here. Integrate at the Gate 2 checkpoint in `governance/execution-roadmap.md`.
