# Learner State Migration Evidence

The legacy learner key `apex-state` remains untouched. Existing migration,
practice, notes, bookmarks, readiness, and encrypted backup code remains in the
compatibility workspace. New package progress uses the separate
`skillforge-course-progress-v1` map keyed by package ID and course version.

This prevents package installation from rewriting or colliding with existing
certification progress. Removing an installed package preserves its progress
namespace rather than deleting learner records.

