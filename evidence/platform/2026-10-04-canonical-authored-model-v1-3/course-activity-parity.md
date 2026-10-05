# Course and activity parity

`packageToCourse` returns `document.course` directly. The package contract aliases `CourseActivity`, `CourseAssessment`, and `CourseModule` from the public course runtime types. There is no `units` alias, default activity conversion, subtype reduction, or unknown-type fallback.

The public semantic fixture verifies reference identity, full mastery rules, full assessment fields, remediation, and fail-closed unknown activity types. Built-in package validation passes for every available public certification.
