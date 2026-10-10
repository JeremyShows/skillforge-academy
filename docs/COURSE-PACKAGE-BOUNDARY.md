# Course package publication boundary

This repository defines a public, versioned course-package contract in `schemas/skillforge-course-v1.schema.json`. Public packages and fixtures must conform to that schema and pass the same validation path as a locally imported package.

## Contributor rules

- Include only course content the contributor has rights to publish.
- Use public objectives, standards, documentation, and subject-matter knowledge as references; write the educational explanation and assessment prompt in original language.
- Use synthetic learner and course fixtures. Do not commit learner records, backups, credentials, private course assets, or machine-specific paths.
- Describe optional integrations using the public package/provider contracts and sanitized examples. A public course package must not depend on a proprietary service.
- Treat publisher, provenance, visibility, and signature fields as metadata. The current local import flow does not establish a remote trusted-publisher system.

The host parses package files as data. It does not execute scripts, commands, native modules, or network requests from a package. See [package security](COURSE-PACKAGE-SECURITY.md) and [distribution status](COURSE-DISTRIBUTION.md).