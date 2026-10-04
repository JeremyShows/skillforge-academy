# Public Course Conversion Evidence

`src/platform/publicPackages.ts` projects the existing public certification
content into the canonical `skillforge-course` package document through one
generic adapter.

| Track | Package | Preserved source | Projected capabilities |
| --- | --- | --- | --- |
| CompTIA A+ | `public.a-plus` | Existing manifest, domains, lessons, practice, assessments, and remediation | Classroom, lecture delivery, instructor fallback, readings, assignments, assessments, remediation, deterministic Labs |
| CompTIA Network+ | `public.network-plus` | Existing public content bundle | Same generic registry and runtime boundary |
| CompTIA Security+ | `public.security-plus` | Existing public content bundle | Same generic registry and runtime boundary |

The adapter is declarative and contains no private-course import, conditional,
path, command, or executable hook. The legacy certification workspace remains
available through the explicit compatibility handoff and continues to own the
legacy `apex-state` learner data and backup behavior.
