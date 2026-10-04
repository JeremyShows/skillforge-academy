# Formal activity authority

`PlatformHub` now opens an activity surface before any progress mutation. The
surface renders authored instruction/prompt text and captures a learner
response. Mastery checks, module assessments, and capstones are evaluated by
`evaluateAuthoredActivityResponse`; an empty or non-matching response fails and
routes through CourseProgress remediation. The UI no longer exposes a generic
“Complete authored activity” success action or supplies a formal `passed: true`
outcome.

Evidence: `src/platform/PlatformHub.tsx`,
`src/platform/runtime.ts`, and `src/platform/semantic-parity-v1-2.test.ts`.
