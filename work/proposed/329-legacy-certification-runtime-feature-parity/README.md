# WI-329 — Legacy Certification Runtime and Feature Parity

> **Status:** Proposed
> **Owner:** Data-migration/runtime integration lead, assigned by the maintainer.
> **Depends on:** WI311, WI320, WI322, WI324, WI325, WI326, WI327, WI328, WI332, and WI333.

## Scope and ownership

Integrate legacy certification courses with the canonical course-platform runtime after the bounded platform capabilities have stable contracts. Own the legacy adapter and migration path, including deterministic identity mapping and compatibility with `apex-state` and `.apexbackup` until verified migration succeeds.

WI329 is the Gate 3 integration owner; it does not redefine `CourseProgress`, create another persistence authority, or modify WI324's envelope owner independently. Coordinate schema or shared persistence changes with the maintainer-designated integration owner. Do not migrate private content or real learner records.

## Integration evidence

Require end-to-end evidence for canonical CourseProgress ownership; legacy certification compatibility; backup and migration preservation; assessment, capstone, lecture, lab, and instructor behavior; package identity/version handling; and restart/recovery. Use public-safe synthetic state and prove old state remains recoverable. Component-only unit evidence does not close this item.

## Start and review gates

This item remains proposed until WI332's governance gate, WI311, WI322, WI333, WI324, and WI325–WI328 are complete. Use an isolated integration branch, an explicit checkpoint with each feature owner, full end-to-end validation, and independent data-migration review before merge.
