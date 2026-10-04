# Modern runtime parity

The public Classroom view plans a bounded session with `planClassSession` and selects its resume point with `activeSegmentForProgress`. Activity evidence is recorded through `completeActivity` via `completeAuthoredActivity`; the UI and canonical platform runtime contain no lesson-card completion bypass.

Lecture and Labs are wired to the extracted generic runtimes when a package declares those catalogs. A public built-in package without authored lecture or lab data does not render those tabs.

Package academic data is adapted into the generic `AcademicCatalog` and the Academic Record derives assignment and assessment status from authoritative `CourseProgress`; the package remains the authored-definition boundary.

`src/platform/modern-runtime.test.ts` covers authoritative activity progression, mastery evidence, remediation/retry, assisted attempts, module-assessment authority, capstone completion, ClassSessionRecord pause/resume, LectureRunState responses/notes/bookmarks/formal gating, bounded instructor fallback, Academic Record derivation, and the full deterministic Labs flow. `src/platform/persistence.test.ts` covers versioned slot isolation, encrypted platform backup roundtrip, and legacy raw `.apexbackup` import.
