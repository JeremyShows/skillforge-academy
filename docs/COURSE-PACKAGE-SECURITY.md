# Course Package Security V1.2

Packages are declarative data. The validator rejects executable-looking keys,
paths, native/plugin fields, endpoint and credential fields, secret-shaped
values, cyclic data, oversized payloads, unsupported capabilities, and
contract-owned unknown fields. Unsupported capabilities are reported before
installation and never executed.

## Runtime isolation

The package boundary is intentionally not a plugin boundary:

- package JSON is parsed and validated before it enters `CourseRegistry`;
- package values are not imported as JavaScript or Rust modules;
- the host owns persistence and navigation; validated `lectures`, `academic`,
  and `labs` authored catalogs determine those data-backed surfaces;
- the instructor fallback is deterministic without a profile, while an
  optional `instructor` section only customizes that fallback;
- remediation stays inside the canonical Course activity/progress model rather
  than becoming a sibling catalog;
- instructor responses cannot mutate CourseProgress; and
- executable, network-backed, or native lab capabilities are rejected by the
  public runtime.

Manifest capabilities remain declared package metadata, not UI activation
switches. The current validator checks supported names and validates each
present catalog independently.

Assets are references with bounded metadata. They do not become arbitrary file
paths or commands. Optional extension data is accepted only in the explicit
`extensionMetadata` area and is not interpreted by the learner runtime.

## Formal activity fail-closed behavior

Lecture formal activities must resolve an exact authored activity using
`moduleId`, `lessonId`, and `activityId`. If the segment kind is not formally
supported, if the source tuple is missing, or if the tuple resolves to a
different activity, the bridge returns a deterministic resolution error and
does not write progress.

Remediation selection is equally strict. A failed activity can enter only a
remediation whose source location and source activity ID match the exact
`CourseProgress.current` record. Physical segment order, lesson-only matches,
and inactive optional remediations are not sufficient.

Native learner persistence is a keyed, bounded, atomic JSON store. The browser
path uses a versioned envelope with a backup key. Backup export uses the
existing AES-256-GCM/PBKDF2 boundary and includes the platform envelope;
legacy raw `.apexbackup` learner JSON remains importable.

## Operational checks

Security-sensitive package changes require:

1. schema and validator tests;
2. registry install/reject/update tests;
3. progress namespace and backup compatibility tests;
4. exact formal-activity and remediation sequencing tests; and
5. browser evidence showing that completed lectures cannot be advanced by a
   stale or inert control.
