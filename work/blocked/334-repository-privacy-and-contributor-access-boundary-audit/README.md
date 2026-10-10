# 334 — Repository privacy and contributor access boundary audit

> **Status**: Blocked pending effective-access verification, organization Actions/secrets visibility, final contact-data classification, outstanding privacy dispositions, and independent technical review.
> **Owner scope**: Governance, privacy, repository access.
> **Depends on**: None.

## Intent

Establish a least-privilege contributor environment after the repository ownership transfer while protecting the private personal course and learner information.

## Scope

Review public SkillForge content and metadata, organization access settings, and metadata only for the private personal course repository. Do not inspect course contents or learner data, invite contributors, rewrite history, or change repository visibility.

## Verified changes

- Organization base repository permission is set to none; the owner remains an administrator.
- Read-only contributor and scoped maintainer teams are assigned only to the public SkillForge repository.
- The active repository ruleset requires pull requests and preserves deletion and non-fast-forward protections, but no longer requires an approving review, latest-push approval, or code-owner approval. `CODEOWNERS` coverage is proposed in PR #19 and can support voluntary reviewer requests after merge; it cannot request a code-owner review for this PR because the base branch does not yet contain the file. Formal GitHub approval is optional under the current single-maintainer model; independent technical review remains required where RepoPact specifies it and does not replace tests or acceptance evidence.
- Public contributor documentation now uses the canonical organization repository URL and describes the reviewed governance path.
- Public audit and evidence records redact private names, identities, values, and checkout locations.

## Closeout blockers

- No authorized disposable test identity was available to verify effective permissions.
- Organization Actions-policy/secrets metadata and personal package metadata were not available through the current credential.
- Two custom-domain contact strings in public release assets are conservatively classified as potentially personal because ownership and role use remain unverified. Redacted disposition: do not reuse them in future assets; keep existing releases unchanged pending owner-only classification and any separately authorized remediation.
- Historical public refs and PR diffs retain checkout identifiers; a merged PR diff also retains deleted machine-profile path fragments. No shared history, refs, or PR records were modified.
- PR #19 still needs an independent technical review of its final head. Formal GitHub approval is no longer a mandatory rule. No invitation or contributor permission change was made.

See the [privacy and access audit](../../../audits/AUDIT-2026-10-09-privacy-access-boundary.md) and [reassessment evidence](../../../evidence/runs/20261010-334-access-boundary-reassessment.json) for redacted details. Keep this item blocked until every required criterion has supporting evidence.
