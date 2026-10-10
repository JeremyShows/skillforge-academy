# WI-322 — Lecture Formal Activity UI Bridge

Fix the public generic Lecture surface so formal authored segments open the
exact CourseActivity named by their source tuple and complete through
CourseProgress. The branch must remain public-safe and stop for independent
review before merge or installed-package acceptance.

The worktree is based on public main
`062fa286005aa9f22a87303f310515ef4beaa83f`. Private authored course data,
Course Studio, and the shared dirty checkout are explicitly out of scope.

## Canonical-main reconciliation (2026-10-09)

The bridge implementation is now reachable from canonical `origin/main` at
`17be629702ef57ffd38db35c5d541745f02e73b0`. The source includes
`src/platform/lectureActivityBridge.ts`, the shared
`src/platform/AuthoredActivitySurface.tsx`, and the formal-activity path in
`src/lecture`; the implementation and remediation commits are `846cc19` and
`762837f`. Focused source tests and the compiled-browser acceptance are retained
in evidence run `20261005-322-lecture-formal-activity-bridge` and its linked
artifacts.

That run records passing unit, content, accessibility, frontend, Rust,
RepoPact, whitespace, browser, and privacy checks. It also records that the
candidate branch had not been independently reviewed or merged when the run was
captured. No WI322 pull request or independent-review closeout is present in
the current PR inventory. The code's presence on main therefore does not
complete the work item: AC-1 through AC-7 remain pending in the registry and
AC-8 has no review evidence. Keep WI322 active until an independent review of
the current main implementation and a separate evidence-backed closeout settle
those criteria.
