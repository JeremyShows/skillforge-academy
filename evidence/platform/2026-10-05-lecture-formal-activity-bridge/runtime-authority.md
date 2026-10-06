# Runtime authority evidence

- `src/platform/lectureActivityBridge.ts` resolves only a formal segment's
  exact `sourceActivityId` plus `sourceLocation` module, lesson, and activity.
- Responses are evaluated by `evaluateAuthoredActivityResponse` and persisted
  with `applyAuthoredActivityResponse`.
- The next Lecture cursor is derived by `advanceAfterFormalActivity` from the
  resulting CourseProgress, including remediation retry state.
- Capstone responses pass the current CourseProgress stage into the existing
  evaluator and completion runtime.
- The resolver returns no result for missing, unknown, or mismatched sources;
  the UI uses `This lecture activity could not be resolved.` and does not
  persist progress.

The focused bridge suite contains 30 tests. The full public suite contains 159
passing tests.
