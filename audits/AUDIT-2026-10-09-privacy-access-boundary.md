# AUDIT-2026-10-09-privacy-access-boundary: Contributor Privacy and Access Readiness

- **Type:** privacy / security / governance
- **Status:** blocked before contributor onboarding
- **Date:** 2026-10-09
- **Related work item:** [WI334](../work/active/334-repository-privacy-and-contributor-access-boundary-audit/work-item.json)

## Scope

Reviewed the public SkillForge Academy repository's current tree, explicitly published branches, pull-request refs, tags, reachable Git history, pull-request descriptions and review metadata, release payloads, governance records, documentation, fixtures, workflow metadata, and available CI-artifact metadata. Organization and repository visibility and permission metadata were queried read-only. Private course-repository contents and learner records were not queried. Exact repository names, access mappings, personal values, and disclosure locations are withheld from this public record.

## Findings

### P1: Organization membership does not isolate the intended contributor surface

The read-only organization access review found that prospective member access would extend beyond the intended public contribution surface. Exact repository names and permission mappings are withheld from this public report. GitHub documents that organization base permissions apply across repositories, while repository roles can scope access to an individual repository or team ([base permissions](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/setting-base-permissions-for-an-organization), [repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)).

**Disposition:** do not invite contributors until the organization owner narrows member base access and grants only the approved repositories through least-privilege teams, or isolates sensitive repositories. Recheck private forks and outside-collaborator grants after any access-model change. No permission was changed and no contributor was invited.

### P2: Current public records included non-public development identifiers

Some current public reconciliation records previously included unnecessary development-location and source-ownership details. Those details have been removed or replaced with generic ownership gates in this PR. A regression check now flags local branch and checkout references in public Markdown and governance JSON.

### P2: Historical public metadata remains

Earlier public Git and pull-request records retain some development identifiers and author-contact metadata. Exact locations, values, and counts were delivered privately to the maintainer. No shared history, pull-request description, or release evidence was deleted or rewritten. A history rewrite would require separate explicit authorization and coordination with forks and clones. Configure future public commits to use an appropriate GitHub no-reply identity.

### P2: Published release payloads need owner classification

The public release payload scan found contact-like metadata that could not be classified from public source or commit metadata. Exact assets, counts, and values were delivered privately to the maintainer. No release asset was modified or removed. The release owner must determine whether the metadata is service/vendor information or personal information before onboarding is declared ready.

### CI artifacts and secrets

The public repository currently reports no Actions artifacts. Some organization-level security metadata was unavailable to the read-only API credentials; no secret values were requested or read. Private-repository artifacts and contents were not inspected.

## Readiness

Not ready for invitations. The organization access boundary must be corrected, and the release-owner classification must be completed. This audit does not establish that private repository files or learner data are safe for new members to access.

## Evidence and limitations

Final Git history findings use an explicit list of published remote branches, public pull-request refs, and tags. The documentation validator does not inspect GitHub pull-request descriptions, release payloads, workflow logs, or organization-level secret values. Historical copies remain until a separately authorized remediation changes them.
