# Roadmap

This roadmap describes the product at a high level. The detailed, evidence-backed backlog remains in [RepoPact work items](work/). Status below is reviewed against `origin/main` as of 2026-10-09.

## Product direction

SkillForge Academy is moving from a multi-track certification study application to an offline-first learning platform for structured courses. The public course package contract and generic runtime are in place; the work ahead is to complete state durability and parity across the new platform surfaces without losing the proven legacy study workflow.

## Delivered foundations

- Windows desktop shell built with Tauri, React, TypeScript, and Rust.
- Built-in CompTIA A+, Network+, and Security+ learning tracks in the legacy workspace.
- Original lessons and assessments, practice and mock workflows, PBQ formats, recall scheduling, analytics, notes, bookmarks, and learner backup compatibility.
- Declarative `.skillforge-course` package contract, strict validation, local import/export, built-in track projections, reusable course progression, and a platform learner envelope with serialized durable writes.
- Local diagnostic export, no telemetry or crash upload, package validation that rejects executable course content, and a public security/privacy policy.

See the [feature maturity matrix](docs/feature-maturity.md) for implementation limits and source evidence.

## Current work

- The frozen `1.4.1-beta.1` candidate still has packaged-app acceptance pending under work item 310. Its remote Windows CI run was waived because the account could not start Actions; this is not evidence of a green remote gate.
- Contributor-facing documentation and architecture descriptions are being reconciled under work item 330.
- Work items 311 (certification IP/content provenance) and 322 (lecture formal-activity UI bridge) remain active.

These are status facts, not a promise that the pre-beta candidate is ready for public distribution.

## Proposed platform extensions

The following are individually scoped proposals, not shipped capabilities:

- Capstone stage identity, evaluation, and Academic Record parity (325).
- Persistent lecture delivery state (326).
- Reachable completion and persistent lab runs (327).
- Native Windows encrypted backup and restore for the platform envelope (328).
- Legacy certification parity and safe migration into the course runtime (329).

Changes must retain the canonical `CourseProgress` authority and the legacy learner-state/backup recovery boundary.

## Deferred or conditional

- Remote course catalogs, signed downloads, trusted publishers, revocation, and network updates are not implemented; local package import is the available flow.
- No external instructor provider is required or integrated in the public runtime; the deterministic local fallback works without one.
- Android is a development foundation, not a public release target. iOS remains blocked on macOS/Xcode-hosted validation.
- Code signing remains conditional on a trusted certificate. Do not imply publisher reputation or signed-installer status.
- A real assistive-technology beta qualification and broader learner pilot require their own accepted evidence.

## Release status and next major milestone

GitHub's latest published release is [v1.3.2](https://github.com/JeremyShows/skillforge-academy/releases). The `1.4.0` entry is a local candidate, and `1.4.1-beta.1` is an unpublished candidate identity. The proposed `v2.0.0-beta.1` milestone is tracked separately under work item 331; no version metadata, tag, installer, or release has been created for it.

Before any public beta, the project needs a known-commit candidate, required automated and independent Windows CI evidence, isolated install/upgrade acceptance, verified learner-state and backup recovery, artifact checksums, privacy/content/accessibility review, accurate limitations, and explicit maintainer authorization. See [v2.0 beta readiness](docs/v2.0-beta-readiness.md). Do not weaken a release gate to force publication.