# WI-322 defect and root cause

Base public commit: `062fa286005aa9f22a87303f310515ef4beaa83f`.

The public Lecture screen rendered every current segment with the same
`Advance authored segment` control and called `advanceLectureSegment`. The
lecture runtime intentionally returns the run unchanged for formal segments,
because those segments must wait for CourseProgress evidence. The UI had no
bridge from a formal lecture segment's `sourceActivityId` and `sourceLocation`
to the authored activity, so a learner could reach a formal segment but could
not open or complete it.

The fix keeps the runtime guard and replaces the dead-end UI path with an
exact source-tuple resolver and a shared authored-activity surface. Missing or
mismatched source tuples render the bounded resolution message and do not call
any progress mutation.
