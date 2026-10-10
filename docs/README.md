# Documentation map

Use this page to find the maintained guide for each task. The repository keeps architecture contracts, authoring rules, learner support, and release records in focused documents rather than repeating them in the README.

## Start here

- [Product overview and current release status](../README.md)
- [Learner getting-started guide](getting-started.md)
- [Contributor onboarding](contributor-onboarding.md)
- [Contributing policy](../CONTRIBUTING.md)
- [Security reporting and data handling](../SECURITY.md)

## Architecture and current maturity

- [Platform architecture](PLATFORM-ARCHITECTURE.md): runtime ownership, package lifecycle, persistence, shutdown, and compatibility.
- [Feature maturity matrix](feature-maturity.md): implemented, experimental, planned, and deferred capabilities with source/work-item evidence.
- [Documentation audit](documentation-audit-2026-10-09.md): verified discrepancies and the reconciliation scope.
- [Course package format](COURSE-PACKAGE-FORMAT.md): versioned public package contract.
- [Course package security](COURSE-PACKAGE-SECURITY.md): inert-data and validation boundaries.
- [Course distribution boundary](COURSE-DISTRIBUTION.md): local import/export behavior and unimplemented remote catalog functions.
- [Built-in course projection](BUILT-IN-COURSE-PROJECTION.md): which legacy track material is represented in the generic runtime today.
- [Course package publication boundary](COURSE-PACKAGE-BOUNDARY.md): public package and fixture expectations.
- [Course authoring boundary](COURSE-AUTHORING-BOUNDARY.md): the public authoring contract for this repository.
- [Multi-certification plan](multi-certification-plan.md): historical planning document; consult the current architecture and maturity matrix for delivered behavior.

## Authoring and quality

- [Certification authoring guide](certification-authoring.md)
- [Course lesson content model](course-lesson-content-model.md)
- [Content quality rubric](content-quality-rubric.md)
- [Objective drift watch](objective-drift-watch.md)
- [A+ course map](a-plus-complete-course-map.md)

## Privacy, recovery, and support

- [Privacy and security](privacy-security.md)
- [Backup and restore](backup-restore.md)
- [Diagnostics](diagnostics.md)
- [Support and troubleshooting](support-troubleshooting.md)

Backup documentation distinguishes the supported legacy `.apexbackup` workflow from the not-yet-accepted native Windows workflow for platform-envelope recovery. Do not rely on the latter for a migration until its acceptance work is complete.

## Operations and release

- [v2.0 beta readiness report](v2.0-beta-readiness.md)
- [Android development foundation](android-mobile.md)
- [iOS development status](ios-mobile.md)
- [Windows code signing](CODE-SIGNING.md)
- [Screenshot generation notes](screenshots/README.md)

Historical candidate and pilot records are retained for governance and are not general public installation instructions. Check the [GitHub releases page](https://github.com/ForgeWireLabs/skillforge-academy/releases) for published installers; a repository version label alone does not mean a release was published.