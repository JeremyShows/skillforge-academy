# AUDIT-2026-10-09-documentation-modernization: Documentation, architecture, and release-state audit

- **Type:** documentation / architecture / release
- **Status:** passed-with-notes
- **Date:** 2026-10-09
- **Auditor:** Codex
- **Related work item:** [WI 330](../work/completed/330-documentation-modernization-and-contributor-onboarding/README.md)

## Scope

Review public product and contributor docs, architecture/package boundaries, release history and metadata, feature maturity claims, public/private documentation boundaries, and RepoPact/governance instructions against the current public main source.

## Context

The README and contributor guide predated the extracted course runtime and serialized learner envelope. Some contributor, release, and scoring statements no longer matched source or current governance, and the active work-item system had replaced the paths named in AGENTS.md.

## Method

- Read README, CONTRIBUTING, SECURITY, ROADMAP, CHANGELOG, AGENTS, and current docs.
- Read relevant RepoPact decisions, work items 310–331, audit records, schemas, and release policy.
- Reviewed course/package, registry, progress, persistence, shutdown, instructor, academic, lecture, lab, backup, and Rust modules plus their tests.
- Compared `VERSION`, `RELEASE_LABEL`, `package.json`, Cargo, Tauri metadata, remote tags, and the public GitHub release page.
- Queried the live default-branch ruleset read-only; verified it has deletion/non-fast-forward rules only, with no required approval count or status checks.
- Added a local documentation validator and ran project gates recorded in WI330 evidence runs.

## Findings

### Independent PR review follow-up at `f1b990f`

The first independent read-only review of PR #14 at `f1b990f` found three P2 documentation blockers:

1. `docs/contributor-onboarding.md:62` said the release workflow ran the full local gate list, including documentation and RepoPact checks, and did not distinguish tag/manual Actions runs from pull requests.
2. `docs/contributor-onboarding.md:106` invoked `repopact new work-item` directly, although the documented clean setup installs RepoPact only inside `.venv` and the installed CLI is exposed as `python -m repopact.cli`.
3. `scripts/validate-docs.mjs:61` only recognized a short list of Windows path directory names, so it missed drive-letter Android SDK/NDK locations in `docs/android-mobile.md:16` and related lines.

The remediation separates local checks from the current release workflow, replaces direct RepoPact executable calls with the virtual-environment module invocation, and adds positive/negative path and workflow-documentation regression checks. The Android guide now uses environment-derived SDK paths and omits the host-specific AVD name. The validator explicitly reports that it does not check external URL availability and scans configured remote URLs without relying on remote names.

Remediation evidence is in [20261009-330-independent-review-remediation](../evidence/runs/20261009-330-independent-review-remediation.json). A fresh independent review of the updated PR commit remains pending; this audit stays open.

### Second independent PR review follow-up at `4e3dcb5`

A second fresh read-only review confirmed the original three findings were fixed, then found two P2 reproducibility defects in the newly documented governance closeout example at `docs/contributor-onboarding.md:153-170`: the example relied on variables from the preceding worked example instead of initializing them in a new session, and its staging commands omitted the work-item directory move and regenerated dashboard. Both are corrected in the current WI330 branch: the closeout example now prompts for and validates its IDs, verifies unique item/evidence paths, uses a repository-relative source for `git mv`, stages the generated dashboard and audit index, and keeps the status-directory move in the index. The regression check verifies these workflow invariants. The same review identified an optional false-positive case for the canonical `ssh://git@github.com/JeremyShows/skillforge-academy` remote; the validator now explicitly accepts that public remote form.

Evidence for this follow-up and its validation is recorded in [20261009-330-closeout-example-remediation](../evidence/runs/20261009-330-closeout-example-remediation.json). A new independent review of the resulting commit remains pending; WI330 and this audit stay open.

### Third independent PR review follow-up at `87243be`

A third fresh read-only review found a P2 synchronization defect in the closeout example at `docs/contributor-onboarding.md:176-186`: a PowerShell script could proceed from opening Notepad to moving the work item and running RepoPact before the user had saved edits. That could move an item whose status is still `active` into `work/completed`, which RepoPact rejects. The current example now pauses at a `Read-Host` prompt after opening the files, instructs the contributor to save and close all editors before continuing, and has a regression assertion that the pause precedes the move. New validation evidence is recorded in [20261009-330-closeout-editor-sync-remediation](../evidence/runs/20261009-330-closeout-editor-sync-remediation.json). Another fresh independent review remains pending; WI330 and this audit stay open.

### Fourth independent PR review follow-up at `ef70689`

A fourth fresh read-only review found a P2 privacy-scanning blind spot: `scripts/validate-docs.mjs` applied path, credential, and configured-remote checks to only the six entry documents and `docs/`, although audit, work-item, and evidence Markdown is also public. A repository-wide scan of 212 Markdown files found 12 machine-specific path matches in three historical audit/work records; expanding the configured-remote scan also found one private remote reference in a historical security incident summary. These Markdown disclosures were replaced with redacted or portable Android SDK references and a generic private-origin description. The validator now scans privacy and configured-remote patterns across repository Markdown while keeping local link/anchor checks scoped to the six entry documents and `docs/`; the contributor guide states that scope. Regression checks assert that audit, work-item, and evidence Markdown is included and `.venv/` is excluded. Validation evidence is recorded in [20261009-330-public-markdown-privacy-scan](../evidence/runs/20261009-330-public-markdown-privacy-scan.json).

### Fifth independent PR review follow-up at `f891126`

A fifth fresh read-only review found two P2 evidence-boundary issues: the Markdown privacy-scan record named the preceding source commit as its reviewed commit, and public evidence JSON still contained machine-specific paths outside the Markdown scan. The validator now scans path, credential, and configured-remote patterns over all repository Markdown plus governance JSON under `evidence/` and `work/`, while local link and anchor checks remain scoped to the six entry documents and `docs/`. Eight historical evidence JSON records were sanitized to remove twelve machine-specific path occurrences; 45 historical evidence records were also cleared of the same non-canonical repository identifier. Regression coverage now asserts that active work-item JSON and evidence-run JSON are included and `.venv/` is excluded. Fresh validation evidence for the implementation commit is recorded in [20261009-330-public-record-privacy-scan](../evidence/runs/20261009-330-public-record-privacy-scan.json). Independent re-review remains pending; WI330 and this audit stay open.

### Sixth independent PR review follow-up at `e5afb9a`

A sixth fresh read-only review found a P2 gap in slash-separated UNC detection: the matcher skipped candidates immediately after an opening parenthesis to avoid flagging protocol-relative URLs, so a Markdown destination with a host/share path passed. The matcher now scans that syntax as UNC-like and the documentation guidance asks contributors to use explicit `https://` schemes for external links. Regression cases cover both the Markdown host/share destination and an explicit HTTPS URL. The reviewer found no current disclosure matching the missed form. Targeted validation evidence is recorded in [20261009-330-unc-destination-scan](../evidence/runs/20261009-330-unc-destination-scan.json). A fresh independent review remains pending; WI330 and this audit stay open.

### Seventh independent PR review follow-up at `b695927`

A seventh independent read-only review found three P2 blockers: angle-bracket Markdown link/reference destinations could bypass slash-separated UNC detection; UNC paths serialized in governance JSON could bypass the Windows UNC matcher; and `docs/getting-started.md` incorrectly said the latest published v1.3.2 release included Network+ and Security+, although its tagged manifest contains A+ only. The privacy matcher now covers angle-bracket Markdown destinations, unquoted HTML `href` values with slash-prefixed host/share destinations, and JSON-stringified UNC paths, with explicit HTTPS negative cases. Getting-started now distinguishes the A+-only v1.3.2 release from Network+ and Security+ in unpublished candidates. Regression coverage passes 18 path cases. The full content, accessibility, Vitest, frontend build, Rust, and documentation gates passed; the documented RepoPact creation, evidence registration, dashboard, validation, and closeout sequence also passed in an isolated clone with no RepoPact executable on PATH. Evidence is recorded in [20261009-330-angle-bracket-unc-release-accuracy](../evidence/runs/20261009-330-angle-bracket-unc-release-accuracy.json). The subsequent exact-head review at `f12348e` found one more UNC-style file URI bypass, recorded below. WI330 and this audit remain open.

### Eighth independent PR review follow-up at `f12348e`

An eighth fresh read-only review confirmed the angle-bracket Markdown, JSON-escaped UNC, and published-release fixes, then found that a network-share file URI could bypass the privacy scan because it followed a URI scheme. The path scanner now detects file URIs with host/share authorities; its Windows drive-path matcher also detects local drive paths encoded as file URIs. HTTPS destinations remain excluded. The validator regression suite now passes 23 positive and negative path cases. The full content, accessibility, Vitest, frontend build, Rust, and documentation gates passed again, and RepoPact dashboard and validation were rerun with PATH restricted. Evidence is recorded in [20261009-330-file-uri-path-scan](../evidence/runs/20261009-330-file-uri-path-scan.json). The final exact-head review is recorded below.

### Ninth independent PR review and merge at `a562159`

A fresh independent read-only review checked the documentation audit, contributor onboarding, maturity matrix, architecture descriptions, privacy boundaries, validator, release-readiness statements, links, setup commands, and RepoPact workflow against the current source and governance records. It found no P1/P2 blockers and recommended proceeding with PR #14. The reviewer confirmed the 23-case validator suite, the 37-file local-link/anchor scan and repository-wide privacy scan coverage, the pinned RepoPact validation, and the previously recorded project gates. The review also confirmed the published v1.3.2 release is A+-only and that external URL availability is outside the local validator's scope.

PR #14 was merged after that review as merge commit `fed5f159f7134298ead925ea3386398e4cb14aeb`, with reviewed head `a562159aaeed5b1186eca913a56e7f86d5d87e2a` and base `17be629702ef57ffd38db35c5d541745f02e73b0`. The live repository ruleset was checked at closeout: the active `no delete` ruleset blocks deletion and non-fast-forward updates; it does not require approvals or status checks. The GitGuardian check passed. Review and merge evidence is recorded in [20261009-330-independent-review-and-merge](../evidence/runs/20261009-330-independent-review-and-merge.json).

### P1: Contributor and signing docs referenced a non-public repository location

**Status:** remediated in WI330 branch

Evidence: onboarding clone URL and code-signing `gh secret` examples now use the public repository; historical candidate notes no longer link to a non-public workflow location. The docs validator also checks protected remote locations when configured.

Recommendation:

- Keep all public clone commands, release links, and integration examples on public contracts and sanitized values.

### P1: Mock percentages were described as vendor passing scores

**Status:** remediated in public product/getting-started/changelog copy

Evidence: wording now calls them SkillForge practice benchmarks and disclaims official-score conversion, consistent with active WI311.

Recommendation:

- Keep vendor scoring claims in WI311's evidence-backed review and never derive a raw-percent rule from a scaled score.

### P2: Course platform completion and built-in package coverage were overstated

**Status:** remediated in README, architecture, and feature matrix

Evidence: `src/platform/publicPackages.ts` projects domains/lessons to instruction plus optional remediation; it does not project all legacy assessment banks or authored lecture/academic/lab catalogs. WI325–329 remain proposed, WI322 active, and WI324 completed.

Recommendation:

- Update the maturity matrix only from merged source and accepted work-item evidence.

### P2: Work-item, version, and PR guidance was stale

**Status:** remediated in AGENTS, CONTRIBUTING, onboarding, ROADMAP, and CHANGELOG

Evidence: the canonical paths are now `work/`, `decisions/`, `audits/`, `evidence/`, `governance/`, and `schemas/`; current GitHub ruleset and implementation/closeout PR sequence are described accurately.

Recommendation:

- Recheck live GitHub rules before relying on current branch rules. Do not conflate independent technical review with formal GitHub approval.

### P2: No repeatable documentation link/privacy/version check existed

**Status:** remediated in WI330

Evidence: `npm run validate:docs` checks local links and heading anchors in the six entry documents and `docs/`, scans machine-specific paths, credential-shaped strings, and configured private/internal remotes across repository Markdown and governance JSON under `evidence/` and `work/`, and checks version consistency.

Recommendation:

- Run the validator for documentation changes and extend it only when a concrete gap appears.

### P2: v2.0 beta readiness was not separated from docs work

**Status:** tracked separately in proposed WI331

Evidence: current public release/tag is v1.3.2; 1.4.0 and 1.4.1-beta.1 are unpublished candidates; no v2 candidate exists. WI310 AC-4 package acceptance remains pending; the old candidate's remote Windows CI was blocked/waived. The release workflow currently marks drafts `prerelease: false`.

Recommendation:

- Do not change version metadata, tag, build for distribution, or publish until WI331's gates and explicit authorization are complete.

## Evidence

- See [documentation discrepancy report](../docs/documentation-audit-2026-10-09.md), [feature maturity matrix](../docs/feature-maturity.md), and [v2.0 beta readiness](../docs/v2.0-beta-readiness.md).
- See [WI330 evidence run `20261009-330-documentation-and-project-gates`](../evidence/runs/20261009-330-documentation-and-project-gates.json) for dependency installation, documentation/content/accessibility validation, tests, frontend build, Rust checks, and whitespace validation.
- The [implementation PR #14](https://github.com/ForgeWireLabs/skillforge-academy/pull/14) merged after a no-blocker independent review. This record and the WI330 status move are the separate governance-closeout change.

## Risks

- This audit covers documentation and source review; it does not qualify an installer or close release blockers.
- The documentation validator checks local links and anchors but does not verify external URL availability.
- WI311 and WI322 remain active. WI310's 1.4.1-beta.1 packaged-app acceptance gate remains incomplete.

## Actions

- [x] Replace stale public positioning and onboarding instructions.
- [x] Publish current feature-maturity and release-readiness records.
- [x] Add and run the documentation validator and applicable project checks.
- [x] Receive independent technical review with no P1/P2 blockers and merge the documentation PR.
- [x] Complete the separate RepoPact governance-closeout change after merge.

## Final Status

Passed with notes. The exact-head review found no P1/P2 blockers; PR #14 merged, and the separate RepoPact governance-closeout change records WI330 as complete.
