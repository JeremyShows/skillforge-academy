# Source extraction matrix

| Private source | Public destination | Boundary result |
|---|---|---|
| `src/course/types.ts` | `src/course/types.ts` | Generic course/progress types extracted; private authored IDs omitted |
| `src/course/progress.ts` | `src/course/progress.ts` | Modern activity/mastery/resume authority extracted; private migration IDs removed |
| `src/classroom/*` | `src/classroom/*` | Generic planning/session types extracted; private program identity generalized |
| `src/lecture/*` | `src/lecture/*` | Segment/run semantics extracted; authored private lecture catalog not copied |
| `src/instructor/*` | `src/instructor/*` | Bounded instructor modes/fallback extracted; private provider adapter omitted |
| `src/academic/*` | `src/academic/*` | Generic academic types/progress extracted; private authored catalog omitted |
| `src/labs/*` | `src/labs/*` | Rich deterministic runtime extracted; private authored lab catalog omitted |

The public adapter is source-truthful: built-in certification packages contain only lesson-derived instruction/readings and the bounded instructor profile.

