# AUDIT-2026-10-09-privacy-access-boundary: Contributor Privacy and Access Readiness

- **Type:** privacy / security / governance
- **Status:** blocked before contributor onboarding
- **Updated:** 2026-10-10
- **Related work item:** [WI334](../work/blocked/334-repository-privacy-and-contributor-access-boundary-audit/work-item.json)

## Scope

Verified the canonical public SkillForge repository after transfer, the current default branch, public branch and tag refs, public pull-request records, release and Actions metadata, public-facing documentation, and available organization access metadata. Queried metadata only for the private personal course repository; its contents, files, branches, tags, answers, learner records, progress, and personal files were not inspected. No secret values were read. Exact private repository names, collaborator identities, contact strings, local checkout values, and exposed public ref locations are omitted from this public record.

## Verified ownership and organization access

- The canonical SkillForge repository is public under ForgeWireLabs. The former repository path resolves to the transferred repository.
- PR #18 remains merged. Its head is c492d3f6b242fb4e4bad731cbbedb00c453b3457, and merge commit 8a549b84b429f94d94de0c70ee5e65dffc35ad6d is the current remote main commit.
- Organization base repository permission was read before the authorized correction and is now none. GitHub still reports the owner as an organization administrator.
- The organization has one current administrator member, two private repositories, no outside collaborators, and no pending invitations.
- ForgeWireLabs-Contributors has pull access only to the public SkillForge repository. ForgeWireLabs-Maintainers has maintain access only to that repository. Neither team is assigned to a private repository. GitHub included the owner as the sole team maintainer; no contributor was added.
- Repository inventory contains six public repositories (five active and one archived) and two private repositories. Available metadata does not classify the two private repositories as proprietary engineering, internal research, or personal learning material; their purpose remains owner-classification work, and names are withheld. There are no outside collaborators or team grants on the private repositories.
- Both private organization repositories report zero current Actions artifacts and zero repository-level secrets and variables. Actions are disabled on one; on the other, Actions are enabled with all action sources allowed, a read-only workflow token, and PR-review approval disabled. SkillForge itself has Actions enabled with all action sources allowed, a read-only workflow token, PR-review approval disabled, and zero repository-level secrets and variables. The organization-level sharing policy and secret/variable visibility remain unverified because the API returned 403.
- Private-repository forks are disabled at the organization level.
- Members can create public and private repositories and invite outside collaborators; organization two-factor enforcement is off. These settings were not changed. Proposed least-privilege settings are to restrict repository creation to owners, restrict outside invitations to owners, and require organization two-factor authentication. Impacts are reduced member self-service, owner-controlled external grants, and mandatory member enrollment; rollbacks are to restore the prior creation, invitation, and two-factor settings. Owner approval is required before applying them.
- GitHub denied the current credential access to organization Actions-policy and secret/variable metadata. No organization secret names or values were read. This leaves organization-level workflow sharing and secret visibility unverified.

## Private personal course isolation

Metadata confirms the course repository is private and owned by the maintainer's personal account, outside ForgeWireLabs. The only direct collaborator is the owner; there are no team grants or forks. The repository has no releases, Actions artifacts, workflow runs, repository secrets, or repository variables. Its repository metadata permits forking, but no fork exists and no other collaborator can use that setting.

Package metadata could not be listed because the current credential lacks the required read scope. No package names, package contents, course files, or learner data were accessed. Since the organization does not own this repository, ForgeWireLabs membership does not supply inherited repository access. An effective-access test identity was unavailable, so this remains metadata evidence rather than a tested negative access result.

## Public repository privacy findings

- The current main tree has no matches for the known local checkout identifiers checked in this audit. Current product documentation is being updated in this PR to use the canonical organization URL.
- Twelve published branch/tag tips were enumerated from the public repository. Two non-main public refs and two public pull-request records still contain local-checkout identifier markers. Older public history also retains identifiers and author-contact metadata, as recorded in the prior audit. Exact refs, files, and values are withheld. No shared history was rewritten, no public ref or evidence was deleted, and no release was modified.
- Six public releases contain twelve assets. All assets were scanned in memory. Two distinct non-placeholder contact strings could not be matched to public-facing source/profile metadata or current public commit-author metadata. Their values were not retained or printed. The release owner must classify them; if personal, replacement or removal requires a separately authorized release change.
- The public repository currently has no Actions artifacts and no repository-level secrets or variables. Actions are enabled and all actions are allowed. Four workflow runs are visible. Organization-level Actions policy and secret visibility remain unverified because the current API credential was denied access.

## Contributor governance controls

The default-branch ruleset now requires pull requests, one approving review, approval of the latest push by someone other than its author, and maintainer code-owner review for protected paths; stale approvals are dismissed. It also blocks deletion and non-fast-forward updates, has no bypass actors, and requires no status-check context. The maintainers team has repository-scoped maintain permission only on the public SkillForge repository.

CODEOWNERS and the branch rules gate governance changes before they reach main. RepoPact validates record schemas and evidence but does not authenticate record authors. A dedicated CI identity check would be required if policy must reject a non-maintainer's proposed work-item change before maintainer review; that CI control is not configured.

## Readiness and blockers

Contributor onboarding is **BLOCKED** until all of the following are resolved:

1. Verify effective access with an authorized disposable identity or another supported GitHub permission-check mechanism. No contributor was invited.
2. Obtain sufficient read-only access to organization Actions-policy/secrets metadata and personal package metadata, or record an owner-verified alternative showing the same boundaries.
3. Have the release owner classify the two unresolved contact strings and decide on any separately authorized asset remediation.
4. Review the remaining public branch/PR/history identifiers privately and authorize any ref-level cleanup. History was not rewritten and evidence was not removed.
5. Obtain the required independent technical review of this PR.
6. Decide whether to tighten repository-creation, outside-invitation, and two-factor settings; no such changes were made without separate owner approval.

This audit does not establish access by impersonating a new member, and it does not claim that written policy alone enforces work-item governance.