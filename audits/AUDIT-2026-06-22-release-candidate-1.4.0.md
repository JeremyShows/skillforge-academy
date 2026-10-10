# AUDIT-2026-06-22-release-candidate-1.4.0: Release Candidate, Version, Installer, And Upgrade Audit

Type: release
Status: passed-with-notes
Date: 2026-06-22
Auditor: Codex
Related Todo: `219`

## Scope

Verify the SkillForge Academy `1.4.0` Windows release-candidate story:
version consistency, release checklist, installer artifact, checksum,
signing status, upgrade behavior, and smoke evidence.

## Context

`1.4.0` is the correct local release-candidate version. GitHub publication is
pending an external billing issue, so the repo must not pretend that `1.4.0`
is already published on GitHub. The latest published GitHub release remains
`v1.3.2`, while local source and artifacts are `1.4.0`.

## Version Check

All source version fields now align:

```text
package.json: 1.4.0
src-tauri/tauri.conf.json: 1.4.0
VERSION: 1.4.0
```

README and CHANGELOG now describe `1.4.0` as the current local release candidate
and state that GitHub publication is pending billing resolution.

## Artifact

```text
Installer:
src-tauri/target/release/bundle/nsis/SkillForge Academy_1.4.0_x64-setup.exe

Checksum:
85fc1c1cb33aa662748db6ab88148de3bd8863fda84f09143fa1ed8457179297  SkillForge.Academy_1.4.0_x64-setup.exe
```

## Installer And Upgrade Smoke

Noninteractive Windows smoke checks passed on the local machine:

```text
Installed app launch:
LAUNCHED pid=22440 name=skillforge-academy
STOPPED pid=22440

Old Apex installer:
OLD_INSTALL_EXIT=0
APEX_AFTER_OLD_INSTALL=True

SkillForge 1.4.0 installer:
NEW_INSTALL_EXIT=0
APEX_HKLM_AFTER_NEW=False
APEX_HKCU_AFTER_NEW=False
SKILLFORGE_VERSION=1.4.0
STATE_DIR_BEFORE=<redacted user-profile application-state directory>
STATE_DIR_AFTER_EXISTS=True
STATE_DIR_AFTER=<redacted user-profile application-state directory>
```

This verifies the NSIS pre-install hook removes the legacy Apex A+ Academy
uninstall entry while preserving the shared app-data directory.

## Command Evidence

```text
node scripts/validate-content.mjs --strict-coverage
PASS - 3 certifications, 770 questions, 135 flashcards, 27 PBQs, 150 lessons.
A+: 63/63 objectives complete.
Network+: 25/25 objectives complete.
Security+: 28/28 objectives complete.

npm test -- --run
PASS - 3 files, 60 tests.

npm test -- src/backup.test.ts --run
PASS - 1 file, 4 tests.

npm run validate:a11y
PASS - 10 checks.

npm run build
PASS - frontend production build; Vite emitted the existing chunk-size warning.

cargo fmt --check --manifest-path src-tauri/Cargo.toml
PASS.

cargo check --manifest-path src-tauri/Cargo.toml
PASS.

npm run desktop:build
PASS - built app exe and NSIS installer for 1.4.0; Vite emitted the existing
chunk-size warning.
```

## Signing Status

Both release artifacts are unsigned:

```text
SkillForge Academy_1.4.0_x64-setup.exe: NotSigned
skillforge-academy.exe: NotSigned
```

This is expected while work item `212` is blocked pending a trusted Windows
code-signing certificate. Windows SmartScreen warnings remain expected.

## Notes

- Interactive manual UI smoke for track switching, answering content, and
  creating a backup was not performed in this noninteractive audit pass. The
  installed app launch, installer upgrade path, persistent app-data directory,
  and backup unit tests passed. Real learner and backup workflow validation are
  tracked by `221` and `228`.
- The GitHub release draft/tag flow is ready in `.github/workflows/release.yml`,
  but actual publication is pending external billing resolution.

## Final Status

Passed with notes. `1.4.0` is coherent as the local release candidate and can be
published once the external GitHub billing issue is resolved and the remaining
manual acceptance decision is made.
