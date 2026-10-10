# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository when available. If that option is unavailable, contact the repository owner privately through the account contact methods.

Include the affected version, reproduction steps, impact, and any suggested mitigation. Do not include real learner data, credentials, or other sensitive information.

## Supported versions

Security fixes are applied to the latest published release and the current main branch. Older releases may not receive backports.

## Local data

The legacy certification workspace keeps learner progress, notes, bookmarks, settings, and scheduling data in local application storage under the existing Tauri application identity `com.apexlearning.aplusacademy`. The course platform stores package identity and CourseProgress in a separate versioned local envelope. Native state is held under the operating system's app-data directory; browser development uses browser storage.

Legacy and course-platform state are JSON and are **not encrypted at rest by the application**. Protect the OS user profile and device encryption. Reset from Preferences deletes local progress on that device. Do not assume legacy progress has migrated to the generic course runtime; that migration has not been completed.

## Backups

Portable `.apexbackup` files may contain the full learner profile. Prefer passphrase-protected exports (PBKDF2-SHA256 + AES-256-GCM). Do not share backup files or passphrases publicly. Import validates JSON, encrypted-envelope version, crypto parameters, and a size ceiling; failed imports do not overwrite current progress. Native packaged backup/restore acceptance for the course-platform envelope remains tracked as proposed work. Details: [privacy and security](docs/privacy-security.md) and [backup and restore](docs/backup-restore.md).

## Telemetry and diagnostics

SkillForge Academy does not collect telemetry and does not upload crash reports. Support uses an optional local diagnostic export from Preferences. By default, that export redacts display name and note text. See [diagnostics](docs/diagnostics.md) and [decision 0009](decisions/0009-no-telemetry-local-diagnostic-export-only.md).

## Permissions

- **Desktop (Tauri):** core capabilities required by the app; no shell or arbitrary filesystem plugin. Packaged WebView CSP restricts script and connect sources.
- **Android:** Internet permission is declared for the WebView/Tauri runtime; it is not used for product analytics or account APIs. Android is not a public release commitment.
- **iOS:** runtime and permission review is pending macOS/Xcode validation (work item 218).

See [privacy and security](docs/privacy-security.md) and the [feature maturity matrix](docs/feature-maturity.md) for current implementation status.