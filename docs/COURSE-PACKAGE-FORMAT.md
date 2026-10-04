# `.skillforge-course` Format V1

V1 uses a canonical UTF-8 JSON document with the `.skillforge-course`
extension. A JSON document avoids archive and path-traversal complexity while
the logical contract remains stable for a future immutable artifact host.

## Manifest

The manifest contains `format`, `formatVersion`, package/course/content
versions, identity, title, description, optional publisher/authors/license,
capabilities, visibility metadata, and provenance headroom. It does not contain
learner identity or provider credentials.

## Content

The canonical document can declare courses, programs/placement metadata, units,
lessons, activities, lecture catalogs, instructor profiles, readings,
assignments, assessments/rubrics, remediation, deterministic labs, bounded
asset metadata, prerequisites, and conservative package migrations.

## Install and update

Import is parse → validate → cross-reference check → capability negotiation →
metadata review → local install. Duplicate package IDs are rejected. Updates
require a higher package version and preserve the existing learner namespace;
incompatible updates are rejected rather than silently migrating state.

Removal never deletes learner records. V1 removes the package while preserving
the namespaced record for future archive/reinstall support. Built-in packages
cannot be removed.

## Provenance

The manifest has optional source, SHA-256, and signature-status fields. V1 can
hash local package bytes but does not invent a signing PKI.

