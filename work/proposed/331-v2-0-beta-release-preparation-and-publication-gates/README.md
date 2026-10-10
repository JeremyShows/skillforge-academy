# WI-331 — SkillForge Academy v2.0.0-beta.1 Release Preparation and Publication Gates

> **Status:** Proposed
> **Owner:** Governance/release maintainer; technical owners retain their implementation surfaces.
> **Depends on:** WI330 (completed documentation and contributor readiness).

## Purpose and phase boundaries

WI331 governs a possible v2.0.0-beta.1 release. Its RepoPact dependency permits
harmless preparation after the documentation foundation is available. It does
not authorize a candidate build, learner pilot, tag, or publication.

### Release preparation

Preparation may inspect version lineage, release metadata, pipeline feasibility,
packaging constraints, compatibility questions, documentation, and known gaps.
It may not claim a candidate is verified or publish artifacts. It can proceed
without waiting for unrelated platform implementation work.

### Candidate verification

Candidate verification starts only after the capabilities being claimed are
implemented and integrated. A full v2 platform parity claim requires Gate 3
integration evidence (WI325–WI329), WI311 legal/IP review, WI322 reviewed
runtime behavior, WI324 persistence compatibility, and WI333 privacy safeguards
when learner data is involved. Scope any smaller candidate honestly and record
known gaps. Build and verify the exact clean commit and binary, with unique
identity, SHA-256, automated and independent Windows CI evidence, fresh-install,
upgrade, legacy-state, backup/restore, recovery, accessibility, security, and
privacy checks as applicable.

WI310's `1.4.1-beta.1` artifact, hash, and historical checks do not qualify a
v2 binary. WI228 remains tied to its registered WI310 candidate. A pilot of a
different candidate needs an explicit candidate-specific amendment and fresh
evidence before participants are recruited.

### Publication authorization

Publication is a separate final gate. Require release-specific evidence,
security and privacy review, accurate limitations, technical/governance
approval, and explicit maintainer authorization. Passing implementation or
candidate checks alone does not authorize a public release.

## Acceptance criteria

The six canonical criteria in `work-item.json` remain unchanged. Record each
criterion's evidence at the phase where it applies; preparation evidence cannot
substitute for candidate verification or publication approval.
