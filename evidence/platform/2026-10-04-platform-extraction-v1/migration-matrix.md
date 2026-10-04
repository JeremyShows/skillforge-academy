# Public Platform Extraction V1 Migration Matrix

| Surface | Classification | Evidence |
| --- | --- | --- |
| Course context, registry, package validation | REPLACE WITH GENERIC CONTRACT | `src/platform/` |
| Classroom, lecture delivery, instructor fallback | USE MODERN PRIVATE IMPLEMENTATION, GENERICIZED | `CourseRuntimeContext` and public Academy UI |
| Academic course progress | COMBINE | New namespaced package progress plus legacy certification state |
| Public A+, Network+, Security+ content | KEEP PUBLIC IMPLEMENTATION / ADAPT | Built-in package adapters |
| Backups, notes, bookmarks, Tauri, mobile, accessibility | KEEP PUBLIC IMPLEMENTATION | Existing compatibility gates |
| Deterministic Labs capability | REPLACE WITH GENERIC CONTRACT | Declarative lab types and bounded runtime |
| Private authored course material | COURSE-SPECIFIC — PACKAGE IT | Private worktree only |
| Full Course Studio and marketplace | FUTURE GAP | Architecture handoff only |

