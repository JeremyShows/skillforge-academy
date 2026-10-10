# Getting started with SkillForge Academy

SkillForge Academy keeps certification study materials and learner progress on your device. No account or cloud sync is required.

## Install the latest public release

1. Open the [GitHub releases page](https://github.com/ForgeWireLabs/skillforge-academy/releases) and download the latest published Windows installer. As of 2026-10-09, that is v1.3.2.
2. Verify the installer using the SHA-256 checksum published with that release.
3. Run the installer. Published Windows installers are currently unsigned and may trigger a SmartScreen warning; follow the release's signed/unsigned status and the [support guide](support-troubleshooting.md).

The source repository also has an unpublished 1.4.1-beta.1 candidate. It is not the latest public release. The course-library experience described below is under active development and may not appear in the published v1.3.2 application.

## Choose a learning path

The published v1.3.2 release includes the CompTIA A+ track only. The current source tree also contains Network+ and Security+ tracks; those changes are in unpublished candidates. Choose a track in a build that includes it and use lessons, practice, recall cards, and performance views to plan a study session. Questions and explanations are original educational content, not copied or recalled live exam items.

The current source branch adds a shared Academy course runtime. It can open built-in course projections and import a local `.skillforge-course` package. The package must pass validation before installation; it is data, not executable code. No remote course catalog is available.

## Study and review

A simple session can be:

1. Read a lesson or course activity.
2. Practice a topic or domain and review the explanation.
3. Use recall cards to revisit concepts over time.
4. Review your progress and choose the next area to study.

Mock exams are practice tools. Their score thresholds are SkillForge practice benchmarks, not official certification passing percentages or guarantees of exam readiness.

## Keep progress recoverable

Progress is stored locally. The existing `.apexbackup` format supports portable encrypted backups and legacy backup imports. Keep the passphrase separate from the backup file. The newer course-platform envelope has not yet received packaged Windows backup/restore acceptance; see the [feature maturity matrix](feature-maturity.md) and [backup guide](backup-restore.md) before relying on it for a device migration.

For installation, launch, data recovery, or diagnostic export help, see [support and troubleshooting](support-troubleshooting.md), [privacy and security](privacy-security.md), and [diagnostics](diagnostics.md).

## Learn more

- [Documentation map](README.md)
- [Platform architecture](PLATFORM-ARCHITECTURE.md)
- [Course package format](COURSE-PACKAGE-FORMAT.md)
- [Roadmap and release status](../ROADMAP.md)
