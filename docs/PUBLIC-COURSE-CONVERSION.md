# Public Course Conversion

The public certification tracks are converted at the platform boundary by
`buildPublicCoursePackage` in `src/platform/publicPackages.ts`. The adapter
projects the existing certification manifest, domains, lessons, explanations,
practice, assessments, and remediation into the generic declarative
`skillforge-course` document.

| Public track | Package identity | Source preserved | Runtime projection |
| --- | --- | --- | --- |
| CompTIA A+ | `public.a-plus` | Existing A+ manifest, domains, lessons, questions, flashcards, PBQs, and remediation | Generic units, lessons, activities, lectures, assignments, assessments, remediation, and deterministic local lab |
| CompTIA Network+ | `public.network-plus` | Existing Network+ content bundle | Same generic package and registry contract |
| CompTIA Security+ | `public.security-plus` | Existing Security+ content bundle | Same generic package and registry contract |

The conversion is declarative and runtime-neutral. It does not import a
private course, call a course-specific component, execute package content, or
change the legacy `apex-state` key. Public built-ins and future imported
packages therefore exercise the same registry, validation, capability, and
namespaced `CourseProgress` paths.

The old certification workspace remains available through the compatibility
handoff in the Academy surface. This keeps current learner state, backups,
practice behavior, accessibility checks, Tauri resources, and mobile
foundations intact while the generic platform becomes the canonical entry
point.
