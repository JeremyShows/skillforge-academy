# Lecture completion UI evidence

The Lecture surface now derives its completed state from
`lectureCanClose(lecture, run, progress)`.

- While incomplete, informational segments retain `Advance authored segment`.
- While incomplete, interactive segments retain their authored response and
  advance behavior.
- Formal activity segments retain `AuthoredActivitySurface` and do not expose a
  direct lecture advance control.
- Once all active required segments are complete, the UI renders `Lecture
  complete` and renders zero `Advance authored segment` buttons.

The compiled browser acceptance reached this state after a first-attempt pass
and after a fail/remediate/retry pass. Screenshots are stored in
`browser-guided.png` and `browser-complete.png`.
