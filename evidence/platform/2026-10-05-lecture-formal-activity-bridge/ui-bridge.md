# UI bridge evidence

`AuthoredActivitySurface` is now shared by Classroom and Lecture. Lecture
formal segments use the surface for GUIDED_PRACTICE, INDEPENDENT_PRACTICE,
ASSESSMENT, and REMEDIATION. They do not render the direct lecture advance
button. Informational and interactive segments retain the existing lecture
text, response, and advance behavior.

The surface keeps response submission disabled until a response-bearing
activity has text, preserves the existing formal rubric evaluator, and exposes
the existing deterministic instructor fallback without giving it progress
authority. Completion is derived from `lectureCanClose`; the finished state
shows `Lecture complete` and no longer renders a direct advance control, while
incomplete informational and interactive segments retain their existing
controls.
