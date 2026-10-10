# Privacy and security

This document describes the product's current data, package, and permission boundaries. It complements the vulnerability-reporting process in [SECURITY.md](../SECURITY.md) and the accepted [no-telemetry decision](../decisions/0009-no-telemetry-local-diagnostic-export-only.md).

## Summary

| Topic | Current stance |
| --- | --- |
| Account and cloud sync | No account or cloud sync is required. |
| Telemetry and crash upload | None. Diagnostics are user-initiated local exports. |
| Learner state | Stored on the device as JSON. The application does not encrypt state at rest; rely on OS/device profile protection. |
| Portable backup | Existing `.apexbackup` supports passphrase-protected AES-256-GCM exports and legacy JSON import. Packaged native acceptance for the new course-platform envelope remains in WI328. |
| Course packages | Declarative data validated before local install; the host does not execute package code or network requests. |
| External services | Not required for study. The public instructor fallback is deterministic and provider-neutral. |

## Local learner state

The legacy certification workspace preserves the `apex-state` browser key, existing Tauri application identity `com.apexlearning.aplusacademy`, and `.apexbackup` import compatibility. The shared course runtime stores package identity and CourseProgress in a separate versioned platform envelope. On native desktop, the Tauri command layer persists legacy learner state and platform state under the app-data directory. Browser development uses browser storage.

Local JSON is not encrypted at rest by SkillForge. Anyone with access to an unlocked user profile or a compromised device may be able to read it. Uninstall, reset, or upgrade behavior must be tested without using real learner data before release.

## Backup cryptography and limits

The existing encrypted backup format uses:

- Format id `apex-encrypted-backup`, version 1.
- PBKDF2-SHA256 with 210,000 export iterations (import accepts 100,000–500,000).
- A random 16-byte salt and AES-256-GCM with a 12-byte IV.
- An 8-character minimum passphrase and a 5 MiB soft payload ceiling.

The TypeScript backup path handles encrypted exports/imports and can carry the platform envelope. WI324 added envelope classification and atomic learner-state replacement. Native Windows backup/restore UX and packaged round-trip acceptance for the course platform remain proposed in WI328. Legacy state migration into CourseProgress remains proposed in WI329. Do not claim those acceptance gates are complete.

Malformed or unsupported imports are rejected before replacement. Legacy plain JSON backups remain importable for compatibility; treat them as sensitive because they may contain notes and progress. See [backup and restore](backup-restore.md).

## Diagnostics

A diagnostic file is created only when the learner requests an export. By default, display name and note text are redacted. The application does not upload diagnostics or send crash reports. See [diagnostics](diagnostics.md).

## Package and permission boundaries

Package JSON is parsed and validated before install. The public host does not execute scripts, native modules, commands, endpoints, or credentials from package content. Imported packages work locally and do not require an external course catalog or instructor provider.

The desktop Tauri capability set is limited to the needed core commands, with a content-security policy for the packaged WebView. Android declares Internet permission for its WebView/Tauri runtime, not for product analytics or account APIs. iOS runtime permission and storage behavior remain unvalidated because the iOS work item is blocked on host tooling.

## Residual risks

- Local state is not encrypted at rest by the application.
- A passphrase is only as strong as the one the learner chooses.
- Windows installers are unsigned while no trusted code-signing certificate is available (WI212).
- New-platform backup/restore acceptance and legacy-state migration remain open (WI328/WI329).
- iOS runtime, permissions, and backup/document handoff remain unvalidated (WI218).
- The 1.4.1-beta.1 candidate is not a public release; the v2.0 beta release gates are documented separately in [v2.0 beta readiness](v2.0-beta-readiness.md).