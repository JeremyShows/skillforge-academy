# AUDIT-2026-10-04 — Public Platform Extraction V1

Type: architecture, implementation, security, privacy, and compatibility

## Scope

The public feature branch introduces the generic Academy/course runtime and a
declarative `skillforge-course` package boundary. It does not implement a full
Course Studio, marketplace, hosted distribution service, executable plugins,
or installer/release changes.

## Acceptance evidence

- `evidence/platform/2026-10-04-platform-extraction-v1/migration-matrix.md`
- `evidence/platform/2026-10-04-platform-extraction-v1/public-course-conversion.md`
- `evidence/platform/2026-10-04-platform-extraction-v1/package-validation.md`
- `evidence/platform/2026-10-04-platform-extraction-v1/security-scan.md`
- `evidence/platform/2026-10-04-platform-extraction-v1/privacy-scan.md`
- `evidence/platform/2026-10-04-platform-extraction-v1/browser-acceptance.json`

## Review boundary

Built-in public certification tracks and imported packages use the same
registry and validation APIs. Course progress is namespaced separately from
legacy `apex-state`; imported content is declarative data only. The browser
acceptance and full build gates are completed before branch publication.
