# AUDIT-2026-10-09-documentation-modernization: Documentation, architecture, and release-state audit

- **Type:** documentation / architecture / release
- **Status:** open
- **Date:** 2026-10-09
- **Auditor:** Codex
- **Related work item:** [WI 330](../work/active/330-documentation-modernization-and-contributor-onboarding/README.md)

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

Evidence: `npm run validate:docs` checks 37 Markdown files, local links and heading anchors, machine-specific paths, credential-shaped strings, configured private/internal remotes, and version consistency.

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
- The [implementation PR #14](https://github.com/JeremyShows/skillforge-academy/pull/14) is open; independent technical review, merge, and governance closeout remain pending.

## Risks

- This audit covers documentation and source review; it does not qualify an installer or close release blockers.
- WI311 and WI322 remain active. The 1.4.1-beta.1 packaged-app acceptance gate remains incomplete.
- The audit still requires independent technical review and the repository's separate governance closeout after the implementation PR merges.

## Actions

- [x] Replace stale public positioning and onboarding instructions.
- [x] Publish current feature-maturity and release-readiness records.
- [x] Add and run the documentation validator and applicable project checks.
- [ ] Receive independent technical review and merge the documentation PR.
- [ ] Complete the RepoPact governance-closeout PR after merge.

## Final Status

Open pending independent review, implementation merge, and separate governance closeout.
