# Backup, restore, and cross-device transfer

SkillForge keeps learner state locally. The existing `.apexbackup` format is the portable encrypted recovery path for the legacy certification workspace and remains import-compatible with legacy JSON backups.

## Current compatibility

| Surface | State and backup status |
| --- | --- |
| Windows desktop, legacy certification workspace | Tauri app-data JSON persistence and `.apexbackup` export/import are implemented. Use an isolated test profile for release checks. |
| Windows desktop, course-platform envelope | WI324 adds serialized native persistence and an envelope-aware TypeScript backup path. Native packaged backup/restore and round-trip acceptance are still proposed in WI328. |
| Browser development | Legacy and platform state use browser storage. Treat the browser profile as test data; it is not a cross-device sync service. |
| Android | A development foundation exists. Do not infer a generally supported public release from build scaffolding. |
| iOS | Runtime and document-picker/share handoff remain blocked on macOS/Xcode validation. |

Legacy certification progress is not automatically migrated into the generic course runtime. WI329 owns the migration and parity design. Keep original state and backups recoverable while that work is pending.

The encrypted backup envelope uses PBKDF2-SHA256 and AES-256-GCM, with bounded payload sizes and validated imports. It is not encrypted local storage. See [privacy and security](privacy-security.md) for the parameters and residual risks.

## Export and restore

For the currently supported legacy workspace, use Preferences to export a passphrase-protected `.apexbackup`, store the passphrase separately, and keep the file outside the application data directory. Restore by importing the backup in Preferences, then verify the expected progress and saved materials.

For any platform-envelope release candidate, use only the documented acceptance procedure and an isolated test profile until WI328 closes. Do not treat the existence of a serializer or unit tests as a packaged Windows backup/restore pass.

Before testing a risky restore, make a separate backup of the test profile. Never run an installer or import test against a maintainer's real learner data. If an import fails, preserve the original backup and current state for diagnosis; do not uninstall or reset before recovery options are verified.

## Further reading

- [Support and troubleshooting](support-troubleshooting.md)
- [Diagnostics](diagnostics.md)
- [Feature maturity matrix](feature-maturity.md)
- [v2.0 beta readiness](v2.0-beta-readiness.md)