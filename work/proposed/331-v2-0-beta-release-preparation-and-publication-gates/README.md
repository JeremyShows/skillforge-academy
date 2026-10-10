# WI 331 — SkillForge Academy v2.0.0-beta.1 release preparation and publication gates

> **Status:** Proposed
> **Owner scope:** Governance / release
> **Milestone:** Separate from documentation WI330

## Intent

Prepare a technically verified v2.0.0-beta.1 candidate only after the product scope, SemVer lineage, learner-data compatibility, package/backup behavior, installer identity, and release pipeline are reconciled. No release metadata, tag, or distribution is created by proposing this item.

## Dependencies

WI310 pre-beta candidate gate; WI311 legal/content IP hardening; WI322 lecture formal-activity acceptance; WI324 serialized learner envelope; WI325–WI329 platform parity/persistence/migration follow-ups; WI330 public documentation.

## Scope

Version and application identity, release workflow draft/prerelease semantics, clean candidate build, Windows CI, isolated install/upgrade and data-recovery acceptance, checksums, privacy/accessibility/content review, release notes, and explicit maintainer authorization.

## Hard boundary

Do not publish a tag or release, distribute an installer, weaken a release gate, install over a maintainer's application, or modify real learner data. A production build or unit suite alone is not release evidence. If a required gate cannot pass, record the blocker and retain the candidate without publication.

## Acceptance

See `work-item.json`. The item remains proposed until its prerequisites and target scope are ready. Completion requires evidence for every release gate and separate authorization before publication.