# WI324 — Canonical Learner Envelope Persistence Foundation

## Prior persistence flow

PlatformHub loaded the envelope from an effect after rendering default progress, merged stored entries into React state, and discarded save promises. Each save performed its own asynchronous load/merge/write. Native writes used one fixed platform-state.tmp path and performed read/modify/write without an app-process lock. The envelope loader also copied the legacy course-progress key into a new envelope when no platform envelope existed.

## Canonical owner

PlatformLearnerEnvelopeStore now owns one sanitized envelope snapshot. It hydrates once, publishes readiness, serializes mutations, updates in-memory state only from the hydrated snapshot, acknowledges durable writes, surfaces failed writes, supports retry, and exposes a bounded flush. PlatformHub derives CourseProgress from that hydrated snapshot and requests progress and installed-package changes through the owner. The Academic Record remains a projection from authored catalog data and that CourseProgress snapshot.

The user-facing platform region remains in an initialization state until hydration succeeds. Its retry state does not replace unreadable or incompatible saved data with defaults. The certification workspace navigation remains available.

## Durability and shutdown

Pending writes are visible as pending; successful writes become persisted; failed writes remain visibly failed and can be retried. Completion controls say “Evidence in session” until persistence succeeds.

Tauri normal window close now prevents immediate close, waits up to five seconds for the canonical owner’s write queue, records a failure in diagnostics and the console if the bounded flush fails, and then closes. The flush timeout and queue ordering are unit tested. Process termination that bypasses the normal Tauri window close event is outside this close hook.

## Native file protection

Platform-state read/modify/write commands share one process-local mutex. Each write uses a unique same-directory file created exclusively, writes and syncs all bytes before replacement, and removes the temporary file on failure. Windows uses MoveFileExW with replace-existing and write-through flags; other platforms use same-directory rename. Invalid or non-object platform-state files now fail closed rather than being interpreted as an empty map.

## Compatibility and migration boundary

Schema version remains 1. Existing installed package identities and course namespaces, CourseProgress, classroom/lecture/lab slots, and unknown compatible envelope fields are retained. Conflicting package identities and malformed known slots produce a bounded load failure without writing defaults. The namespace remains packageId@courseVersion.

Legacy apex-state, skillforge-course-progress-v1, the course registry, and PlatformLearnerEnvelope remain separate. WI324 does not migrate legacy progress. The existing raw .apexbackup import boundary remains in place; generic envelope backup export/import goes through the canonical owner.

## Test evidence

- Focused envelope/persistence/runtime suite: 28 tests passed across 3 files.
- Full Vitest suite: 173 tests passed across 13 files.
- Rust unit tests: 4 passed, including atomic replacement, overlapping native updates, and preservation after mutation failure.
- Production build, content validation, accessibility validation, Rust format/check, RepoPact, whitespace check, and the public privacy scan passed.

No private package, private fixture, learner backup, installed application, or release installer was used or changed.

## Deferred work

- WI325: capstone stage context, stage-specific evaluation, evidence commit, and Academic Record parity.
- WI326: persistent lecture delivery state.
- WI327: reachable lab completion and persistent lab runs.
- WI328: native Windows encrypted backup and restore.
- WI329: legacy certification runtime parity and actual legacy-state migration.
- WI323: learner UX candidate in its separate worktree.

WI322 was not edited. Course Studio remains blocked and was not started.