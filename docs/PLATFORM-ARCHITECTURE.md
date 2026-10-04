# SkillForge Platform Architecture V1

SkillForge now has one public-safe platform boundary. The platform supplies
runtime behavior; declarative course packages supply authored curriculum.

## Migration matrix

| Subsystem | V1 disposition |
| --- | --- |
| Course runtime and `CourseRuntimeContext` | Replace with generic package context |
| Classroom, lecture delivery, academic structure | Use modern bounded runtime contracts |
| Instructor service and fallback | Use provider-neutral runtime contract |
| Labs runtime and validator | Use generic deterministic capability contract |
| Public certification content | Keep and adapt through built-in packages |
| Public learner state, backups, notes, bookmarks | Keep compatibility implementation; add package namespaces |
| Tauri/native persistence and mobile foundations | Keep public implementation |
| Accessibility and release infrastructure | Keep and run existing gates |
| Package registry/import/validation | Replace one-track assumptions with generic contract |
| Private authored curriculum and evidence | Course-specific; package privately and never copy public |
| Full Course Studio and marketplace | Future work; documentation/headroom only |

The old certification workspace remains an explicit compatibility surface while
the public Academy surface proves the generic package boundary. It is not a
second product runtime; both surfaces share public content and learner storage.

## Runtime context

`CourseRuntimeContext` carries one validated package, its course definition,
capabilities, lecture/lab catalogs, instructor profile, and a namespaced
progress key. Academic progress remains explicit and is not hidden inside the
context.

## Authority boundaries

The platform owns sequencing, validation, persistence, instructor fallback,
capability negotiation, and deterministic labs. Packages cannot mutate
learner mastery, access secrets, or invoke provider/network/native behavior.

