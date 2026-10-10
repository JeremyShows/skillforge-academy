# Contributor onboarding

This guide takes a contributor from a clean clone through a reviewed and governed change. The public documentation describes only the interfaces and source present in this repository; it does not require private course material or an external service.

## 1. Set up a development environment

The release workflow uses Node.js 22 on Windows. Use Node 22 for the closest match to the supported release build. Frontend work can run in a browser. Native desktop work requires Rust stable and the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/), including the Windows build tools and WebView2 runtime described by Tauri.

Clone the public repository and install its locked JavaScript dependencies:

    git clone https://github.com/ForgeWireLabs/skillforge-academy.git
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

Run the checks that match the files you changed. These commands run locally; they are not all GitHub Actions checks:

    npm run validate:docs
    npm run test:docs-validator  # Run when changing the documentation validator
    npm run validate:content
    npm run validate:a11y
    npm test -- --run
    npm run build
    cargo fmt --check --manifest-path src-tauri/Cargo.toml
    cargo check --manifest-path src-tauri/Cargo.toml
    .\.venv\Scripts\python.exe -m repopact.cli validate

The documentation validator checks local Markdown links and heading anchors in the six entry documents and `docs/`. It scans machine-specific paths, credential-shaped strings, and configured remote locations across all repository Markdown and governance JSON under `evidence/` and `work/`, including audit and evidence records; `.git/`, `node_modules/`, `.venv/`, `dist/`, and `target/` are excluded. Use explicit `https://` schemes for external links; ambiguous slash-prefixed host/share forms are treated as UNC-like paths. The validator does not request external URLs, so a passing local check does not establish that external links are available.

Use the documentation, content, and accessibility validators for their respective surfaces. TypeScript behavior changes need tests and a frontend build. Rust changes need formatting and compilation checks. Release packaging needs `npm run desktop:build` plus isolated install/upgrade, learner-state recovery, and checksum evidence; a successful production build alone does not qualify an installer for release.

### Current GitHub Actions coverage

`.github/workflows/release.yml` runs on `v*` tag pushes and manual dispatch; it has no pull-request trigger. Its Windows test job runs on either trigger and invokes `npm run validate:content`, `npm run validate:a11y`, `npm test`, `npm run build`, `cargo fmt --check --manifest-path src-tauri/Cargo.toml`, and `cargo check --manifest-path src-tauri/Cargo.toml`. It does not run `npm run validate:docs` or RepoPact validation. The tag-only release job builds a draft installer through `tauri-action`, optionally signs it when signing secrets are configured, and uploads SHA-256 checksums. The workflow does not run `npm run desktop:build` as a command.

Do not include user learner state, actual backups, credentials, signing material, or private course data in tests, fixtures, screenshots, or evidence. Use synthetic public fixtures.

## 4. Register work and evidence with RepoPact

The durable work-item system is `work/`, not `todos/`. RepoPact is pinned in `requirements-repopact.txt`; after the setup in section 1, invoke it through the virtual-environment Python executable:

    .\.venv\Scripts\python.exe -m repopact.cli new work-item "Short outcome-focused title" --status active
    .\.venv\Scripts\python.exe -m repopact.cli validate
    .\.venv\Scripts\python.exe -m repopact.cli dashboard

The installed RepoPact CLI supports `new work-item`, `validate`, and `dashboard`. It has no general evidence-registration or work-item-closeout subcommand: evidence runs are JSON files conforming to `schemas/evidence-run.schema.json`, and work-item state and audit/index records are edited according to their schemas and the closeout workflow below. Do not rely on a globally installed `repopact` executable.

Before substantive work:

1. Check `git status --short` and confirm the worktree is clean for your task.
2. Inspect `work/active/`, `work/proposed/`, and the RepoPact dashboard for an existing item that covers the change.
3. If none fits, use the RepoPact command above to allocate the next identifier and stamp the item before implementation.
4. Write observable acceptance criteria, affected scopes, dependencies, and a short scope boundary. Keep an item `proposed` until it is ready; use the lifecycle values in `schemas/work-item.schema.json`.
5. Record exact command results in a JSON evidence run under `evidence/runs/` using `schemas/evidence-run.schema.json`, then cite its ID in the acceptance criterion it proves.
6. Validate the repository and regenerate the dashboard when work records change:

       .\.venv\Scripts\python.exe -m repopact.cli validate
       .\.venv\Scripts\python.exe -m repopact.cli dashboard

`decisions/` records stable architectural choices; `audits/` records independent findings; `governance/` and `schemas/` define repository policy and record contracts. Do not invent a work-item ID, mark work complete without evidence, or rewrite historical release records to imply a version was published. Contributors may propose work-item changes, but maintainers alone accept canonical work records; protected paths require maintainer code-owner review. RepoPact validates schemas and evidence, not author identity. A policy that rejects work-item proposals from non-maintainers before review would require a dedicated CI identity check; that check is not currently configured.

## 5. Use pull requests and close out work

Create a focused branch using the `codex/` prefix, commit only scoped files, and open a pull request against `main`. Include the work-item ID, behavior or documentation summary, checks run, and unresolved risks. The repository's GitHub PR template is in `.github/PULL_REQUEST_TEMPLATE.md`. The organization base permission is `none`; the Contributors team has read access to this public repository, and the Maintainers team has repository-scoped maintain access here. Neither team is assigned to unrelated private repositories. New contributor access is owner-controlled; contributors should use a fork and pull request, and receive no private repository access from membership alone.

As verified on 2026-10-10, the active default-branch ruleset requires pull requests, one approving review, approval of the latest push by someone other than its author, and maintainer code-owner review for protected governance paths; stale approvals are dismissed after new commits. It also blocks deletion and non-fast-forward updates. No status-check context is required. Recheck the live ruleset with `gh api repos/ForgeWireLabs/skillforge-academy/rulesets`. A PR is the collaboration path. Independent technical review is a quality assessment and is separate from formal GitHub approval.

For work-item closeout that changes governance records on `main`, use the repository's established sequence: merge the implementation/evidence PR after technical review, then open a separate governance-closeout PR that updates the work-item state and audit/evidence index as required. PRs #12 and #13 demonstrate the sequence for WI324. Do not push directly to `main` or claim closeout before the governance change is merged.

### Worked example: a small documentation correction

Run these PowerShell commands from the repository root. RepoPact prints the allocated work-item path; the commands create a schema-shaped evidence draft and open both records for you to fill in before validation:

```powershell
$python = ".\.venv\Scripts\python.exe"
$created = & $python -m repopact.cli new work-item "Documentation correction" --status active
$itemPath = ($created -replace '^Created ', '').Trim()
$item = Get-Content $itemPath -Raw | ConvertFrom-Json
$itemId = $item.id
$evidenceId = "{0}-{1}-docs-{2}" -f (Get-Date -Format yyyyMMdd), $itemId, (Get-Date -Format HHmmss)
$evidencePath = Join-Path "evidence\runs" "$evidenceId.json"
$evidence = [ordered]@{
  '$schema' = '../../schemas/evidence-run.schema.json'
  id = $evidenceId
  timestamp = (Get-Date).ToString('o')
  work_item = $itemId
  result = 'partial'
  provenance = 'concrete'
  commands = @()
  artifacts = @()
  environment = @{ platform = 'Windows' }
}
$json = $evidence | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText($evidencePath, "$json`n", [Text.UTF8Encoding]::new($false))
notepad.exe $itemPath
notepad.exe $evidencePath
```

Add acceptance criteria to the work item, replace the evidence draft's empty `commands` with the exact commands and exit codes, set its result to match those results, and reference `$evidenceId` from the criterion it proves. Then run:

```powershell
npm run validate:docs
& $python -m repopact.cli dashboard
& $python -m repopact.cli validate
```

Push a focused `codex/...` branch and open an implementation PR that names the work item and evidence. The shell commands below use GitHub CLI (`gh`), which must be installed and authenticated; you can also open the PR in GitHub's web UI after pushing.

### Governance closeout example

After the implementation PR merges, open a new PowerShell session from the updated repository checkout. Enter the merged work-item ID and its evidence-run ID; the commands below set all required variables, find the item regardless of its current status directory, move the completed record with `git mv`, regenerate the dashboard, and stage the dashboard, evidence, and audit index explicitly. The `Read-Host` prompt keeps the sequence paused until you have saved and closed all opened editor windows:

```powershell
$python = ".\.venv\Scripts\python.exe"
$itemId = Read-Host "Merged work-item ID (for example, 330)"
$evidenceId = Read-Host "Evidence-run ID recorded by the work item"
if ($itemId -notmatch '^[0-9]{3,}$') { throw "Enter the numeric RepoPact work-item ID." }
if ($evidenceId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { throw "Enter the evidence-run ID, without a path." }
$closeoutBranch = "codex/closeout-wi-$itemId"
git switch main
git pull --ff-only
git switch -c $closeoutBranch
$itemMatches = @(Get-ChildItem work -Recurse -Filter work-item.json | Where-Object { (Get-Content $_.FullName -Raw | ConvertFrom-Json).id -eq $itemId })
if ($itemMatches.Count -ne 1) { throw "Expected one work item with ID $itemId; found $($itemMatches.Count)." }
$itemPath = $itemMatches[0].FullName
$evidencePath = Join-Path "evidence\runs" "$evidenceId.json"
if (-not (Test-Path -LiteralPath $evidencePath)) { throw "Evidence run not found: $evidencePath" }
# Edit the work item: satisfy accepted criteria, cite evidence, and set status to completed.
# Edit the audit and audits/index.md if closeout requires those records to change.
notepad.exe $itemPath
notepad.exe $evidencePath
notepad.exe audits/index.md
Read-Host "Save and close all opened editors, then press Enter to continue"
$workItemDirectory = Split-Path $itemPath -Parent
$workItemDirectoryRelative = Resolve-Path -LiteralPath $workItemDirectory -Relative
$completedDirectory = Join-Path "work\completed" (Split-Path $workItemDirectory -Leaf)
if (Test-Path -LiteralPath $completedDirectory) { throw "Completed work-item destination already exists: $completedDirectory" }
git mv -- $workItemDirectoryRelative $completedDirectory
$itemPath = Join-Path $completedDirectory "work-item.json"
& $python -m repopact.cli dashboard
& $python -m repopact.cli validate
git add -- $evidencePath audits/reports/dashboard.md audits/index.md
# If an audit record changed, stage its exact path too, for example: git add -- audits/AUDIT-YYYY-MM-DD-topic.md
git status --short
git commit -m "governance: close out WI $itemId"
git push -u origin $closeoutBranch
gh pr create --base main --fill
```

`git mv` stages both the old and new work-item paths, so the closeout commit does not leave an active-directory duplicate. Stage any changed audit/index files by exact path; do not stage every file under the governance directories.

## 6. Keep public contributions safe

The repository is public. Use only public contracts and sanitized examples when describing integrations. Do not add private repository locations, proprietary source code, API credentials, machine-specific absolute paths, private course content, internal infrastructure details, or sensitive environment configuration. External services are optional integration territory; the public app must remain usable without a proprietary service. Never include a real learner record or backup in an issue, screenshot, fixture, pull request, or test log.

## Further reading

- [Documentation map](README.md)
- [Architecture overview](PLATFORM-ARCHITECTURE.md)
- [Course package format](COURSE-PACKAGE-FORMAT.md)
- [Privacy and security](privacy-security.md)
- [Roadmap](../ROADMAP.md), [changelog](../CHANGELOG.md), and [security policy](../SECURITY.md)
