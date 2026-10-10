# WI-323 — Classroom and Authored Activity Layout Usability

> **Status:** Proposed
> **Owner:** implementation
> **Depends on:** WI314 (broader learner UX program) and WI322 (formal activity bridge review/closeout)

## Why this work item exists

Installed acceptance of the private authored course exposed a focused public learner-UX issue set: classroom and activity controls are cramped into a dense row; response fields become too narrow for comfortable reading and writing; lesson text can collapse into narrow columns; and entire units can appear as one long flattened course page.

This proposal records those observations as a separate, bounded public follow-up. It does not change the learner interface or the CourseProgress authority behavior tested by WI322. It should be activated only after the current installed acceptance and WI322 review gates are resolved.

## Acceptance criteria

- [ ] **UX323-1** — Reproduce and document the four observed layout problems in representative Classroom, authored activity, lecture, and long-unit views at supported desktop window sizes.
- [ ] **UX323-2** — Define a readable responsive layout for activity prompts, response controls, actions, lesson text, and long units while preserving clear navigation and progress context.
- [ ] **UX323-3** — Apply the approved layout changes without changing authored runtime evaluation, CourseProgress authority, assessment/remediation semantics, or private course data.
- [ ] **UX323-4** — Verify desktop resizing and supported narrow layouts, keyboard-only interaction, visible focus, and accessible labels for all affected controls.
- [ ] **UX323-5** — Record before/after usability evidence and pass the applicable accessibility and UI validation gates before marking the candidate complete.

## Non-goals

- Redesigning the UI during installed acceptance.
- Changing WI322 completion/evaluation behavior or private course content.
- Starting Course Studio.

## Maintainer acceptance and canonical registration (2026-10-09)

The maintainer accepted this bounded scope for canonical registration. The
original `work-item.json` and proposal were copied without changing the title,
source, preflight record, scope, or five acceptance criteria from the preserved
`ux-follow-up-candidate` worktree at base
`72a8ecba5a9f0cb5a48188b357a59d796515b40e`.

Scope acceptance is not implementation acceptance. No WI323 implementation or
usability evidence was found in that worktree, branch, canonical main, or the
open PR inventory. All five original criteria remain pending, so WI323 remains
proposed until WI314 and WI322 satisfy its registered dependencies. Its owner
is the responsive learner-layout surface; WI322 owns runtime activity
resolution/evaluation, and WI325 owns capstone context/evaluation semantics.
