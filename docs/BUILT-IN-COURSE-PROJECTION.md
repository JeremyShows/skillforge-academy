# Built-in course projection

The legacy certification workspace and the shared course runtime are related but do not yet have feature parity. `src/platform/publicPackages.ts` projects built-in track data into the generic package contract; it does not copy every legacy study bank into a complete academic course.

## Current projection

For each available certification track, the builder maps:

- each legacy domain to a course module;
- each legacy lesson to a course lesson and required instruction activity; and
- each instruction activity to an optional authored remediation activity.

The resulting built-in package uses a `builtin.<cert-id>` package identity. The shared runtime provides course identity, progression, local registration, and CourseProgress behavior.

## Not projected today

The builder does not turn legacy question, PBQ, or flashcard banks into package assessment activities. Its generated lesson assessment, capstone, and final-assessment definitions are empty placeholders. It does not author lecture, academic, or lab catalogs for these built-ins. The broader practice, mock exam, PBQ, recall, notes, bookmarks, and analytics workflows remain in the legacy certification workspace.

This is why the README describes the course runtime as an evolving platform and why the feature matrix marks the built-in projection experimental. Proposed WI329 covers legacy certification runtime and feature parity, including a safe state migration; it is not complete.

## Public package boundary

The generated package is declarative data and uses the same validator and local registry as an imported `.skillforge-course`. It does not include learner progress, execute content, or require an external catalog or provider. See [package format](COURSE-PACKAGE-FORMAT.md), [package security](COURSE-PACKAGE-SECURITY.md), and [distribution status](COURSE-DISTRIBUTION.md).