# 334 — Repository privacy and contributor access boundary audit

> **Status**: Blocked pending access verification and independent review.
> **Owner scope**: Governance, privacy, repository access.
> **Depends on**: None.

## Intent

Establish a least-privilege contributor environment after the repository ownership transfer while protecting the private personal course and learner information.

## Scope

Review public SkillForge content and metadata, organization access settings, and metadata only for the private personal course repository. Do not inspect course contents or learner data, invite contributors, rewrite history, or change repository visibility.

## Verified changes

- Organization base repository permission is set to none; the owner remains an administrator.
- Read-only contributor and scoped maintainer teams are assigned only to the public SkillForge repository.
- The active ruleset requires a non-author approval and latest-push approval. Initial CODEOWNERS coverage is proposed in PR #19 and will apply to future protected-path changes after merge; it cannot request a code-owner review for this PR because the base branch has no CODEOWNERS file.
- Public contributor documentation now uses the canonical organization repository URL and describes the reviewed governance path.
- Public audit and evidence records redact private names, identities, values, and checkout locations.

## Closeout blockers

- No authorized disposable test identity was available to verify effective permissions.
- Organization Actions-policy/secrets metadata and personal package metadata were not available through the current credential.
- Two custom-domain contact strings in public release assets have unverified ownership and are treated as potentially personal; future assets should use an owner-confirmed role contact. Existing releases were not changed.
- Historical public refs and PR diffs retain checkout identifiers; a merged PR diff also retains deleted machine-profile path fragments. No shared history, refs, or PR records were modified.
- PR #19 has no independent review or approval. The sole maintainer-team member is its author; no invitation or permission change was made.

See the [privacy and access audit](../../../audits/AUDIT-2026-10-09-privacy-access-boundary.md) and [reassessment evidence](../../../evidence/runs/20261010-334-access-boundary-reassessment.json) for redacted details. Keep this item blocked until every required criterion has supporting evidence.
