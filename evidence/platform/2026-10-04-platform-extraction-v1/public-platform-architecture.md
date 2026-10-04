# Public Platform Architecture Evidence

The public app now starts in a generic Academy surface backed by
`CourseRegistry`, `CourseRuntimeContext`, declarative package validation,
namespaced course progress, deterministic instructor fallback, lecture delivery,
assignments, assessments, and deterministic local Labs.

The existing certification workspace remains reachable through an explicit
compatibility action. It continues to own the legacy `apex-state` learner key,
practice engine, mock exams, notes, bookmarks, encrypted backups, and public
content banks.

No package code is imported or executed. Built-in and imported courses use the
same package document and registry APIs.

