# AUDIT-2026-10-09-privacy-access-boundary: Contributor Privacy and Access Readiness

- **Type:** privacy / security / governance
- **Status:** blocked before contributor onboarding
- **Updated:** 2026-10-10
- **Related work item:** [WI334](../work/blocked/334-repository-privacy-and-contributor-access-boundary-audit/work-item.json)

## Scope

Verified the canonical public SkillForge repository after transfer, the current default branch, public branch and tag refs, public pull-request records and changed-file patches, release and Actions metadata, public-facing documentation, and available organization access metadata. Queried metadata only for the private personal course repository; its contents, files, branches, tags, answers, learner records, progress, and personal files were not inspected. No secret values were read. Exact private repository names, collaborator identities, contact strings, local checkout values, machine paths, and exposed public ref locations are omitted from this public record.

## Verified ownership and organization access

- The canonical SkillForge repository is public under ForgeWireLabs. The former repository path resolves to the transferred repository.
- PR #18 remains merged at 8a549b84b429f94d94de0c70ee5e65dffc35ad6d. PR #19 merged after review as 61c36cd8803463101b68a5b9cd336eef670f93af; the WI334 access and onboarding audit remains blocked.
- Organization and repository access boundaries were inspected using available metadata. Default access restrictions are configured for the planned contributor scope; effective access verification remains pending, and no contributor was added.
- Repository-level workflow, artifact, and secret-sharing exposure was assessed where metadata was available. Organization-wide workflow policy and secret sharing could not be verified with the available credential. No secret names or values were read.
- No organization security settings were changed. Any organization-wide access or authentication changes remain owner decisions and are outside this audit's authorization.

## Private personal course isolation

Personal learning materials are maintained outside the contributor-accessible repository scope. Ordinary ForgeWireLabs membership alone does not grant inherited access to a personal-account repository. No private course contents, learner data, secret values, or package contents were inspected. Delegated access through tokens, applications, integrations, and shared packages or artifacts remains unverified; no authorized effective-access test identity was available. This is not a tested negative access result.

## Public repository privacy findings

- The current main tree has no matches for the known private checkout marker in the scanned Markdown and governance records. The PR #19 additions contain no email-like contact strings, user-profile paths, or private-checkout identifiers. Its Windows-path-shaped scan matches are validator-regex syntax, not machine paths. Canonical organization URLs replace the former personal-owner repository URLs in the updated public documentation.
- Historical public refs and pull-request diffs retain some checkout or source-location metadata. The reviewed records disclosed location labels, not private course contents, answer keys, learner records, or progress data. Specific references and locations are omitted; no history, branch, tag, or pull-request record was altered.
- Existing public release assets contain contact metadata whose ownership and project role cannot be established from public evidence. Redacted disposition: treat it as potentially personal, omit it from future builds unless the release owner privately confirms its role, and leave existing assets unchanged absent separate authorization.
- Public-repository workflow and artifact exposure was assessed at a control level. Repository readers may be able to access workflow logs and artifacts according to repository permissions; no log contents were inspected. Organization-level workflow policy and secret-sharing visibility remain unverified, so this audit does not establish that organization secrets are unavailable to public-repository workflows.
- No credentials, tokens, secret values, private course content, or learner information were found in the reviewed public records. This does not resolve the access-verification blockers below.

## Contributor governance controls and PR #19 review

The earlier audit snapshot recorded a mandatory human-review gate; that state is historical. The current single-maintainer model permits normal pull-request changes without mandatory GitHub approval while retaining pull-request and repository-integrity controls. Formal GitHub approval is optional; independent technical review and all RepoPact acceptance evidence remain separate requirements. PR #19 merged after independent read-only review of its exact final head; WI334 remains blocked.

The merged `.github/CODEOWNERS` file assigns maintainers to canonical governance paths and can support voluntary review requests. The active default-branch ruleset requires pull requests and retains repository-integrity protections without mandatory human approval. RepoPact validates record structure and evidence but does not authenticate record authors; a dedicated identity check would be needed to enforce authorship policy before maintainer review.

The independent read-only review of the final PR #19 head found no P1/P2 findings. It confirmed that the earlier P2 metadata over-disclosure was resolved, remaining verification gaps are stated, and no additional personal information or sensitive content was introduced. This review is recorded in the [redacted evidence run](../evidence/runs/20261010-334-independent-review-and-controls.json); it is not formal GitHub approval and does not replace tests or acceptance evidence.

## Readiness and blockers

Contributor onboarding is **BLOCKED** until all of the following are resolved:

1. Verify effective organization-member access with an explicitly authorized disposable identity or supported permission-check mechanism. None was available; the owner account was not used as a substitute, and no contributor was invited.
2. Separately verify metadata-only delegated access paths to the private personal-account repository, including personal access tokens, OAuth/GitHub Apps and other integrations, and shared package or artifact access. Organization membership alone does not grant access to that repository, but direct collaborator and fork metadata do not establish the absence of these delegated routes.
3. Obtain sufficient read-only access to organization Actions-policy and secret-sharing metadata and personal package metadata, or have the owner verify these boundaries without exposing secret values or course contents.
4. Have the release owner privately classify the two custom-domain contacts. Until ownership is confirmed, use role-based contacts in future release builds; changing existing release assets remains separately authorized work.
5. Review historical checkout and source-location metadata and obtain explicit owner authorization before any targeted history remediation. No history was rewritten, branch deleted, PR removed, or evidence deleted.
6. Before contributor invitations are reopened, review organization-wide access and authentication controls; those settings were not changed in this reassessment.

This audit does not establish access by impersonating a new member, and it does not claim that written policy alone enforces work-item governance.

## Historical disclosure classification

A prior public revision of this audit included detailed organization/repository permission relationships, workflow/security settings, and private-repository existence/access metadata. Some high-level pull-request policy outcomes are observable through GitHub; the more granular permission mappings and configuration details are internal operational/security metadata. The prior revision disclosed metadata only, not repository contents. No credentials, tokens, secret values, private course materials, or learner information were present in the reviewed disclosure.

Detailed configuration is not needed to support the current public governance finding; this revision retains the control-level assessment, its limits, and outstanding verification steps. The prior commits remain publicly reachable, and no historical refs were changed. Based on the reviewed non-secret metadata, history rewriting is not recommended; if an owner identifies a credible ongoing risk in those historical details, any targeted historical redaction should be handled as a separate, narrowly scoped, explicitly authorized action.
