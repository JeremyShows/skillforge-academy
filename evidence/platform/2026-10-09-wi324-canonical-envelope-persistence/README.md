# WI324 — Canonical Learner Envelope Persistence Foundation

## Prior persistence flow

PlatformHub loaded the envelope from an effect after rendering default progress, merged stored entries into React state, and discarded save promises. Each save performed its own asynchronous load/merge/write. Native writes used one fixed platform-state.tmp path and performed read/modify/write without an app-process lock. The envelope loader also copied the legacy course-progress key into a new envelope when no platform envelope existed.

## Canonical owner

PlatformLearnerEnvelopeStore now owns one sanitized envelope snapshot. It hydrates once, publishes readiness, serializes mutations, updates in-memory state only from the hydrated snapshot, acknowledges durable writes, surfaces failed writes, supports retry, and exposes a bounded flush. PlatformHub derives CourseProgress from that hydrated snapshot and requests progress and installed-package changes through the owner. The Academic Record remains a projection from authored catalog data and that CourseProgress snapshot.

The user-facing platform region remains in an initialization state until hydration succeeds. Its retry state does not replace unreadable or incompatible saved data with defaults. The certification workspace navigation remains available.

## Durability and shutdown

Pending writes are visible as pending; successful writes become persisted; failed writes remain visibly failed and can be retried. Completion controls say “Evidence in session” until persistence succeeds.

Tauri normal window close synchronously stops new platform mutations before taking the final write-queue barrier. Mutations already admitted finish in order; later submissions are explicitly rejected. The close handler waits up to five seconds, records any undurable revision in diagnostics and the console, and then applies the destroy policy. Process termination that bypasses the normal Tauri window close event is outside this close hook.

## Native file protection

Platform-state read/modify/write commands share one process-local mutex. Each write uses a unique same-directory file created exclusively, writes and syncs all bytes before replacement, and removes the temporary file on failure. Windows uses MoveFileExW with replace-existing and write-through flags; other platforms use same-directory rename. Invalid or non-object platform-state files now fail closed rather than being interpreted as an empty map.

## Compatibility and migration boundary

Schema version remains 1. Existing installed package identities and course namespaces, CourseProgress, classroom/lecture/lab slots, and unknown compatible envelope fields are retained. Conflicting package identities, envelope-level corruption, and malformed non-progress known slots fail closed without writing defaults. Individual CourseProgress corruption is isolated in the remediation section below. The namespace remains packageId@courseVersion.

Legacy apex-state, skillforge-course-progress-v1, the course registry, and PlatformLearnerEnvelope remain separate. WI324 does not migrate legacy progress. Existing raw .apexbackup imports are accepted only when their legacy learner shape is positively identified. A declared platform backup is validated strictly and commits both learner stores through the canonical import transaction. This does not add the deferred WI328 backup/restore workflow.

## Initial implementation test evidence

These baseline counts are retained for the initial implementation and are
superseded by the post-review-remediation counts below.

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

## Independent review follow-up (2026-10-09)

The independent review on PR #12 identified two blockers. Both fixes and their
regression tests are included in implementation commit
`dcc530b07964149b0eb0c4f3d1a59aaf4fb205b`.

### Finding 1: repeated close events could bypass the flush

The prior `closing` guard returned before calling `preventDefault()`. A repeated
native close request could therefore close the window while the first bounded
learner-state flush was still pending.

`createLearnerStateCloseHandler()` now consumes every close event before
checking its shared in-flight shutdown promise. Repeated events reuse the same
bounded `flush(5000)` and do not start parallel flushes. A successful or
failed/timed-out flush proceeds to one native `destroy()` attempt; pending and
failed results are reported through diagnostics and the console. A destroy
failure is reported and leaves later close requests able to retry. The
behavioral tests block persistence, issue a second close request, and prove
both events are prevented while flush and destroy each run once.

### Finding 2: object-shaped progress bypassed course validation

The envelope sanitizer accepted any object in the progress slot, and
`courseProgressMapFromEnvelope()` cast it directly to `CourseProgress`.

Envelope hydration now rejects progress slots that lack structural identity,
location, progress maps, review/session arrays, or correctly shaped optional
runtime compatibility fields. This check remains course-independent.
Before runtime use, the projection calls the existing
`sanitizeCourseProgress()` with each current package context. It verifies
course/package identity and course version, validates locations against the
active authored course, filters stale activity/lesson/module state, rebuilds
runtime compatibility fields, and derives the returned `contentVersion` from
the active authored course. A changed content version therefore keeps the
existing `packageId@courseVersion` namespace and reconciles progress against
the new content. Projection does not mutate or persist its sanitized result;
only an intentional envelope mutation writes through the canonical store.

Coverage now includes rejection of `{}` and incomplete progress during
hydration without saving defaults, safe handling of a malformed object at the
runtime projection boundary, preservation of valid progress, isolation across
namespaces, sanitization of missing nested runtime fields, and changed content
under the same package/course-version namespace. The existing failed-save and
retry test remains green. Envelope-only tests use an explicitly named
structural fixture and are not presented as proof of course-aware validity.

### Initial validation at the first review-fix implementation (historical)

## Second review blockers: implementation and reproduction (2026-10-09)

Implemented in commit bae7940b53515d1a3bfc211a3a65cfbf803df7f2 from review
base 34b1fd2a10fb97d38be4211d9fb4231e327dd3c6.

The shutdown store now closes mutation admission synchronously before taking
the final serialized-write barrier. Calls already admitted finish in order;
later calls receive an explicit rejected acknowledgment. The terminal
shutdown promise is memoized, and the window close handler reuses one bounded
attempt. Snapshots track revision and durableRevision; a revision is only
acknowledged as persisted after its save returns successfully. Timeout, load,
or save failures retain an error diagnostic before the normal destroy policy
runs. Regressions cover delayed concurrent writes, post-quiescence rejection,
failed saves, timeout, repeated close requests, and destroy failure.

Backup format identification now happens before payload validation. Any
platform learner format declaration, including an unsupported version suffix,
is handled as a platform backup and cannot fall through to legacy import.
Platform course slots, schema, metadata, and embedded learner state are
validated before writes. Platform imports replace apex-state and the platform
envelope through one transaction: browser storage rolls all keys back on
failure; the native command stages both files and restores the first file if
the second replacement fails. Regressions prove malformed progress,
unsupported platform schema/format, malformed embedded legacy state, decode
failure, and persistence failure leave both learner stores unchanged. A
positively identified legacy payload remains importable.

Hydration now isolates malformed per-course CourseProgress and mismatches
against installed package/course identity. It retains the raw slot in a
quarantine record, makes other valid course records available, and persists
the repaired envelope. A failed quarantine save remains visible and retryable.
Ordinary course mutations preserve the quarantine record even when a mutator
attempts to change or remove it. Envelope-level corruption and unsupported
schemas still fail closed. Content-version changes remain in the established
packageId@courseVersion namespace and use authored-course reconciliation.

Verification on the remediation implementation:

- Focused envelope, persistence, runtime, and close-lifecycle suite: 47 tests
  passed across 4 files.
- Full Vitest suite: 192 tests passed across 14 files.
- Rust formatting and check passed; 7 Rust library tests passed, including
  second-file rollback and strict native backup-payload validation.
- Production build, all content checks, all 20 accessibility checks,
  RepoPact validation, whitespace check, and changed-file privacy marker scan
  passed.

The implementation has not been independently re-reviewed. PR #12 stays draft
and WI324 stays active until an independent reviewer clears all three blockers.

### Initial follow-up validation (historical)

- Focused envelope, persistence, modern runtime, and close-lifecycle tests: 35
  passed across 4 files.
- Full Vitest suite: 180 passed across 14 files.
- Production build passed; content validation covered 3 tracks and 150
  lessons; all 20 accessibility checks passed.
- Rust formatting and check passed; 4 Rust library tests passed.
- RepoPact validation, generated dashboard validation, whitespace check, and
  public privacy leakage check passed.

### Prior PR state (historical at dcc530b)

Both independent-review threads were replied to with the fixes and test
results, then resolved after commit `dcc530b07964149b0eb0c4f3d1a59aaf4fb205b`
was pushed. PR #12 remains open and draft. WI324 remains active until fresh
independent review accepts these corrections; WI325-WI329 remain proposed.
