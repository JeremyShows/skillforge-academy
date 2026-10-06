# Assessment and remediation regression evidence

Focused tests cover authored rubric failure and pass behavior, remediation
return-to-activity semantics, module assessment authority, and capstone stage
authority. The follow-up tests additionally prove that a first-attempt pass
does not enter a physically adjacent remediation segment, while a failure
enters only the exact remediation for the current `CourseProgress` location.
Remediation completion returns to the assessment, and a passing retry advances
past remediation.

The browser fixture covers the same sequence: first-pass success skips
remediation, fail/remediate/retry returns to and passes the assessment, and the
completion state reaches the closing segment without a review detour.

No UI path grants a formal result directly. All formal outcomes come from the
existing deterministic authored rubric and CourseProgress completion logic.
