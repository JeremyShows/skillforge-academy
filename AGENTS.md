# SkillForge Academy Agent System

This file is the operating manual for contributors and agents working in this repository. Follow the canonical RepoPact records and verify claims against current source, tests, accepted decisions, and audit evidence.

## Prime directive

SkillForge Academy is an offline-first, course-first learning platform with a legacy certification workspace. Preserve learner trust, local data, content originality, accessibility, and build reliability while extending the shared course runtime.

Optimize for:

1. Shippable increments that keep the existing A+, Network+, and Security+ learner experience working.
2. Evidence-backed changes, with tests or validation when behavior changes.
3. Explicit decisions, risks, work items, and handoff evidence.
4. Original educational content only; never add exam dumps, recalled live questions, reconstructed vendor PBQs, or proprietary assessment material.
5. Compatibility with existing learner state, the `apex-state` key, and `.apexbackup` imports unless an approved migration item changes that contract.
6. Public-safe documentation: no private repository locations, proprietary source, credentials, machine paths, private course content, or internal integration details.

## Source of truth

- Work items: `work/` (RepoPact)
- Decisions: `decisions/`
- Audit records: `audits/`
- Evidence runs and reports: `evidence/`
- Governance policy and workflow: `governance/`
- Record contracts: `schemas/`
- Product docs: `README.md`, `CONTRIBUTING.md`, `ROADMAP.md`, `CHANGELOG.md`, and `docs/`

There is no active `todos/` or `tracking/` directory. Use RepoPact status and concrete evidence; preserve historical records rather than rewriting them to imply a release or behavior that did not happen.

## Starting and scoping work

1. Run `git status --short` and preserve unrelated changes.
2. Inspect `work/active/`, `work/proposed/`, the RepoPact dashboard, and relevant decisions/audits for an existing item.
3. For substantive work with no matching item, create one before implementation with `python -m repopact.cli new work-item "Outcome-focused title" --status active`. Let RepoPact allocate the identifier.
4. Record scope, observable acceptance criteria, dependencies, and assumptions in the item.
5. Use a clean isolated branch/worktree for changes. Do not push directly to `main`.

RepoPact lifecycle statuses are `proposed`, `active`, `blocked`, `deferred`, and `completed`; use the schema in `schemas/work-item.schema.json`.

## During work

- Keep edits inside the work-item scope and preserve user or local changes.
- Add a decision record for stable architectural choices.
- Record evidence in `evidence/runs/` using `schemas/evidence-run.schema.json`; reference evidence IDs from acceptance criteria.
- Add meaningful audit findings to `audits/` and update `audits/index.md`.
- Keep package content declarative. The host validates packages and owns persistence; course files do not execute code.
- Keep `CourseProgress` authoritative for course progression. Do not add independent completion or academic-grade persistence without an accepted migration decision.
- Use public contracts and synthetic fixtures for optional integrations.

## Validation

Install the pinned RepoPact dependency from `requirements-repopact.txt`, then run the relevant gates:

- Governance/record changes: `python -m repopact.cli validate`
- Documentation: `npm run validate:docs`
- Certification content: `npm run validate:content`
- Accessibility-affecting UI: `npm run validate:a11y`
- TypeScript/app behavior: `npm test -- --run` and `npm run build`
- Rust/Tauri backend: `cargo fmt --check --manifest-path src-tauri/Cargo.toml` and `cargo check --manifest-path src-tauri/Cargo.toml`
- Installer/release work: `npm run desktop:build` plus isolated installation, upgrade, learner-data recovery, and checksum evidence

If a required check cannot run, record the exact reason and remaining evidence in the active work item and handoff. A successful build or unit suite alone does not qualify an installer for release.

## Review and closeout

Use focused pull requests and independent technical review for architecture, persistence, privacy, content, accessibility, and release work. GitHub approval rules and technical review are separate: verify the active repository ruleset instead of claiming a required approval count.

Where RepoPact closeout changes governance records on `main`, merge the implementation/evidence PR after review, then use a separate governance-closeout PR for work-item status and audit/evidence index changes. Close work only after acceptance criteria, required evidence, residual risks, and `git status --short` are checked.

## Repository map

- `src/`: React and TypeScript application.
- `src/content/`: certification manifest and per-track content banks.
- `src/course/`, `src/classroom/`, `src/lecture/`, `src/academic/`, `src/labs/`, `src/instructor/`: reusable course-domain modules.
- `src/platform/`: package validation/registry, runtime, platform UI, learner envelope, shutdown coordination.
- `src-tauri/`: Rust persistence commands, Tauri shell, and packaging configuration.
- `scripts/`: content, accessibility, documentation, and developer validation.
- `docs/`: learner, contributor, architecture, authoring, privacy, and operations documentation.
- `work/`, `decisions/`, `audits/`, `evidence/`, `governance/`: durable project records.

## Handoff

For meaningful work, report the work-item ID, changed files, commands and results, evidence/audit references, residual risks, and the pull-request or closeout status. Do not report a PR as merged or a release as published until the public repository confirms it.