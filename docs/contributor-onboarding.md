# Contributor onboarding

This guide takes a contributor from a clean clone through a reviewed and governed change. The public documentation describes only the interfaces and source present in this repository; it does not require private course material or an external service.

## 1. Set up a development environment

The release workflow uses Node.js 22 on Windows. Use Node 22 for the closest match to the supported release build. Frontend work can run in a browser. Native desktop work requires Rust stable and the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/), including the Windows build tools and WebView2 runtime described by Tauri.

Clone the public repository and install its locked JavaScript dependencies:

    git clone https://github.com/JeremyShows/skillforge-academy.git
    cd skillforge-academy
    npm ci

For a frontend development session:

    npm run dev

For the native Windows application, install the prerequisites above and run:

    npm run desktop:dev

RepoPact is pinned in `requirements-repopact.txt`. Use an isolated Python environment for governance commands:

    py -3.12 -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements-repopact.txt
    .\.venv\Scripts\python.exe -m repopact.cli validate

On other supported Python versions, substitute the local Python executable when creating the environment. Do not install RepoPact unpinned for repository validation.

## 2. Find the right code and content

| Area | Entry points |
| --- | --- |
| Application shell and legacy certification workspace | `src/App.tsx`, `src/logic.ts`, `src/types.ts` |
| Built-in certification content | `src/content/certifications.json`, then `src/content/a-plus/`, `src/content/network-plus/`, and `src/content/security-plus/` |
| Course model and progression | `src/course/` |
| Package schema, validation, registry, and runtime | `src/platform/packageTypes.ts`, `src/platform/packageValidation.ts`, `src/platform/registry.ts`, `src/platform/runtime.ts` |
| Shared course screens | `src/platform/PlatformHub.tsx` |
| Persistence owner and shutdown | `src/platform/persistence.ts`, `src/platform/windowShutdown.ts`, `src-tauri/src/lib.rs` |
| Reusable course surfaces | `src/classroom/`, `src/lecture/`, `src/academic/`, `src/labs/`, `src/instructor/` |
| Validators and authoring tools | `scripts/`, `src/content/validate.ts` |
| Contracts and schemas | `schemas/`, `docs/COURSE-PACKAGE-FORMAT.md` |
| Durable work, audits, and evidence | `work/`, `decisions/`, `audits/`, `evidence/`, `governance/` |

The legacy certification workspace supplies the full A+, Network+, and Security+ study loop. The shared course runtime is a separate evolving surface: current built-in packages are a projection of certification domains and lessons, and do not yet provide full lecture, lab, academic, assessment, or migration parity. Check the [feature maturity matrix](feature-maturity.md) before describing a capability as complete.

### Adding certification content

Use the manifest and existing track directory as the source of truth. The scaffold command is:

    npm run scaffold:cert -- --id <track-id> --prefix <id-prefix> --name "<display name>" --shortName "<short name>" --exam <exam-id>

Author original material under the corresponding `src/content/<track-id>/` directory and run `npm run validate:content`. See [certification authoring](certification-authoring.md) and the [content quality rubric](content-quality-rubric.md). Never copy, reconstruct, or submit live exam questions, vendor answer keys, or proprietary assessments.

### Changing the course platform

Treat `.skillforge-course` as validated declarative data, not a plugin system. Keep authored content separate from derived learner state. `CourseProgress` is the authority for lesson and activity completion; views must not grant mastery merely because content was displayed. Preserve course namespaces, the legacy `apex-state` and `.apexbackup` compatibility boundary, and the native persistence owner. Read [platform architecture](PLATFORM-ARCHITECTURE.md), [package format](COURSE-PACKAGE-FORMAT.md), and [package security](COURSE-PACKAGE-SECURITY.md) before changing those contracts.

## 3. Run the relevant checks

Run checks that match the files you changed. The release workflow also runs these project gates on Windows:

    npm run validate:docs
    npm run validate:content
    npm run validate:a11y
    npm test -- --run
    npm run build
    cargo fmt --check --manifest-path src-tauri/Cargo.toml
    cargo check --manifest-path src-tauri/Cargo.toml
    .\.venv\Scripts\python.exe -m repopact.cli validate

Use the documentation, content, and accessibility validators for their respective surfaces. TypeScript behavior changes need tests and a frontend build. Rust changes need formatting and compilation checks. Release packaging needs `npm run desktop:build` plus isolated install/upgrade, learner-state recovery, and checksum evidence; a successful production build alone does not qualify an installer for release.

Do not include user learner state, actual backups, credentials, signing material, or private course data in tests, fixtures, screenshots, or evidence. Use synthetic public fixtures.

## 4. Register work and evidence with RepoPact

The durable work-item system is `work/`, not `todos/`. Before substantive work:

1. Check `git status --short` and confirm the worktree is clean for your task.
2. Inspect `work/active/`, `work/proposed/`, and the RepoPact dashboard for an existing item that covers the change.
3. If none fits, let RepoPact allocate the next identifier and stamp the item before implementation:

       .\.venv\Scripts\python.exe -m repopact.cli new work-item "Short outcome-focused title" --status active

4. Write observable acceptance criteria, affected scopes, dependencies, and a short scope boundary. Keep an item `proposed` until it is ready; use the lifecycle values in `schemas/work-item.schema.json`.
5. Record command results in an evidence run under `evidence/runs/` using `schemas/evidence-run.schema.json`, then cite its ID in the acceptance criterion it proves.
6. Validate the repository and regenerate the dashboard when work records change:

       .\.venv\Scripts\python.exe -m repopact.cli validate
       .\.venv\Scripts\python.exe -m repopact.cli dashboard

`decisions/` records stable architectural choices; `audits/` records independent findings; `governance/` and `schemas/` define repository policy and record contracts. Do not invent a work-item ID, mark work complete without evidence, or rewrite historical release records to imply a version was published.

## 5. Use pull requests and close out work

Create a focused branch using the `codex/` prefix, commit only scoped files, and open a pull request against `main`. Include the work-item ID, behavior or documentation summary, checks run, and unresolved risks. The repository's GitHub PR template is in `.github/PULL_REQUEST_TEMPLATE.md`.

As verified on 2026-10-09, the active default-branch ruleset prevents deletion and non-fast-forward updates; it does not require a fixed approval count or a required-status-check set. Recheck the live ruleset before relying on it: `gh api repos/JeremyShows/skillforge-academy/rulesets`. A PR is the project collaboration path. An independent technical review is a quality assessment and is not the same as formal GitHub approval.

For work-item closeout that changes governance records on `main`, use the repository's established sequence: merge the implementation/evidence PR after technical review, then open a separate governance-closeout PR that updates the work-item state and audit/evidence index as required. PRs #12 and #13 demonstrate the sequence for WI324. Do not push directly to `main` or claim closeout before the governance change is merged.

### Worked example: a small documentation correction

1. Check for an active documentation item; otherwise create one with `repopact new work-item` and add a criterion for the corrected information and a criterion for link validation.
2. Edit the source document and navigation index, then run `npm run validate:docs` and RepoPact validation.
3. Add the exact commands and results to an evidence run and reference it from the work item.
4. Push a focused `codex/...` branch and open an implementation PR that names the work item and evidence.
5. Ask a contributor to independently check the claim and the rendered links. Address review findings in the same PR.
6. After the implementation PR merges, open the governance-closeout PR to mark the acceptance criteria satisfied, update the audit index/dashboard, and preserve the review evidence.

## 6. Keep public contributions safe

The repository is public. Use only public contracts and sanitized examples when describing integrations. Do not add private repository locations, proprietary source code, API credentials, machine-specific absolute paths, private course content, internal infrastructure details, or sensitive environment configuration. External services are optional integration territory; the public app must remain usable without a proprietary service. Never include a real learner record or backup in an issue, screenshot, fixture, pull request, or test log.

## Further reading

- [Documentation map](README.md)
- [Architecture overview](PLATFORM-ARCHITECTURE.md)
- [Course package format](COURSE-PACKAGE-FORMAT.md)
- [Privacy and security](privacy-security.md)
- [Roadmap](../ROADMAP.md), [changelog](../CHANGELOG.md), and [security policy](../SECURITY.md)