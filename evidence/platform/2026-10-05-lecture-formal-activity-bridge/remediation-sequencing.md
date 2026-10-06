# Remediation sequencing evidence

The runtime now treats `CourseProgress.current` as the only remediation
selector. A remediation is eligible only when its `sourceLocation` and
`sourceActivityId` exactly match the failed activity. Lesson-only matches and
physical segment order are not used.

Evidence:

- first-attempt assessment pass advanced from `short-assessment` to
  `short-closing`; `short-remediation` was not selected;
- failed assessment moved to `short-remediation` and left the assessment
  incomplete;
- completed remediation returned to `short-assessment` for retry; and
- passing retry advanced to `short-closing` without revisiting remediation.

An inactive optional remediation is excluded from the normal success path and
does not block `lectureCanClose`. The focused bridge suite contains 34 passing
tests, including these cases.
