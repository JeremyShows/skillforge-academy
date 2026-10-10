# Documentation and architecture audit — 2026-10-09

- **Baseline:** `origin/main` at `17be629702ef57ffd38db35c5d541745f02e73b0`
- **Work item:** WI 330
- **Purpose:** Reconcile public product and contributor documentation with the implemented course platform and current release/governance records.

## Method

Reviewed README, CHANGELOG, ROADMAP, CONTRIBUTING, SECURITY, AGENTS, the docs hierarchy and existing architecture/package/privacy/release pages; RepoPact decisions and schemas; active/completed/proposed work items; current source modules, tests, build scripts, release workflow, and version metadata. Checked public GitHub release/tag history and the active default-branch ruleset. No installer was built or installed during this documentation audit.

## Discrepancies found

1. **Product positioning lagged behind implementation.** The README opened as a certification-prep desktop application, even though the repository now contains a reusable course runtime, declarative packages, a course registry, CourseProgress authority, and the WI324 learner-envelope owner. The previous page also put detailed architecture in the product overview and surfaced screenshots from the legacy certification workspace as if they represented the full current platform.
2. **Contributor setup was unsafe and inaccurate.** The old onboarding clone command used a non-public repository location, told contributors to commit directly to `main`, and did not describe the active RepoPact work/evidence records or the separate governance closeout process.
3. **Governance paths had drifted.** AGENTS.md pointed contributors to `todos/` and `tracking/`, which do not exist on the audited branch. The canonical records are `work/`, `decisions/`, `audits/`, `evidence/`, `governance/`, and `schemas/`.
4. **Release state was easy to misread.** GitHub's latest published release and tag are v1.3.2. Repo metadata is `VERSION=1.4.1`, `RELEASE_LABEL=1.4.1-beta.1`, with package/Cargo/Tauri identity on the same prerelease label. The 1.4.0 entry is an unpublished local candidate; 1.4.1-beta.1 is also not a published release. No v2.0 tag or candidate exists.
5. **Mock-score copy made an unsupported vendor claim.** README, getting-started, and historical changelog wording described raw SkillForge percentages as official certification passing scores or conversions. Active WI 311 requires these to be described as SkillForge practice benchmarks, not official score conversions.
6. **The built-in course projection was overstated.** The old conversion note said legacy questions, assessments, lectures, assignments, and labs were projected into each built-in package. `src/platform/publicPackages.ts` currently maps domains and lessons to generic instruction activities plus optional remediation; it creates empty capstone/final assessments and does not create authored lecture, academic, or lab catalogs. The legacy workspace continues to provide the broader certification feature set.
7. **Persistence documentation needed the WI324 ownership and limits.** The source now serializes learner-envelope mutations, waits for hydration, reports durability, quarantines malformed per-course progress, drains accepted writes on shutdown, and persists platform state through bounded native Tauri commands. However, WI325–329 explicitly leave capstone parity, lecture/lab state persistence, native platform backup/restore acceptance, and legacy progress migration for later work.
8. **No repository docs checker existed.** Relative-link and local-path/privacy checks were manual. The documentation work adds a no-dependency validator and local command.
9. **Public/private boundary docs were too repository-specific and partly inaccurate.** They were replaced with public-contract descriptions that do not depend on private locations or tooling details.

## Verified release and governance facts

- Public release page and remote tags show v1.3.2 as the latest published release/tag: [GitHub releases](https://github.com/JeremyShows/skillforge-academy/releases).
- GitHub's live default-branch ruleset on 2026-10-09 had deletion and non-fast-forward rules only. It did not require an approval count or status checks. RepoPact technical independent review is distinct from those GitHub requirements.
- The repository's current closeout precedent is an implementation/evidence PR followed, after merge, by a separate governance-closeout PR (WI324 PRs #12 and #13).
- The `1.4.1-beta.1` candidate gate remains incomplete: WI310 AC-4 packaged-app interactive acceptance is pending; remote Windows CI was waived/blocked on billing for that frozen candidate. The existing installer is not evidence for current main or a v2 candidate.

## Feature maturity

See [feature-maturity.md](feature-maturity.md) for a subsystem-by-subsystem status matrix with source files and work-item evidence. The key distinction is that the legacy certification study workflow is substantially broader than the built-in course-package projection. Optional catalogs and provider-neutral boundaries are supported; several full learner flows and persistence migrations remain experimental or proposed.

## Actions taken in WI330

- Rewrote README as a course-first overview and made public release status explicit.
- Reconciled AGENTS.md, CONTRIBUTING.md, onboarding, ROADMAP, CHANGELOG, and getting-started copy.
- Added a documentation navigation index and feature-maturity matrix.
- Updated architecture and package boundary descriptions to match the source and WI324–329.
- Added a repeatable documentation validator; no dependency was added.
- Registered v2.0.0-beta.1 release work separately as proposed WI331. No version, tag, installer, or release was changed or published.

## Residual findings and follow-up

- WI322 formal lecture-activity work remains active; document its final merged/accepted state after closeout.
- WI310 AC-4 packaged Windows acceptance is a release blocker. Do not treat local unit/build checks as an installer smoke test.
- WI311 remains active; content IP, objective wording, trademark, and practice-score semantics need its broader closeout.
- WI325–329 remain proposals; do not claim their outcomes.
- The v2.0.0-beta.1 milestone has no release candidate. It must pass its own clean-commit CI, install/upgrade, data recovery, checksum, privacy, accessibility, and authorization gates.

This audit remains open until the documentation PR receives independent technical review, merges, and its RepoPact closeout is accepted.
