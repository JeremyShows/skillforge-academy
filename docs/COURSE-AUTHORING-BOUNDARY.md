# Course authoring boundary

Public course authoring in this repository targets the `CoursePackageDocument` contract in [Course Package Format](COURSE-PACKAGE-FORMAT.md) and the checked-in schema. The runtime accepts authored course data only after schema, identity, capability, and cross-reference validation.

Contributors should author and validate packages through these public interfaces:

1. Follow the canonical Course, module, lesson, activity, mastery, and remediation types.
2. Add optional `lectures`, `academic`, `labs`, `instructor`, or `assets` catalogs only when the package has valid authored data for them.
3. Keep learner state outside course packages. CourseProgress and its platform envelope remain runtime-owned.
4. Validate the package and use public, synthetic fixtures for tests.

No external authoring tool or proprietary integration is required to build the public application. When an optional system needs to exchange a course, document only the versioned public package contract; do not include private source, infrastructure, credentials, course material, or environment details in this repository.

For currently supported surfaces and gaps, see the [feature maturity matrix](feature-maturity.md).