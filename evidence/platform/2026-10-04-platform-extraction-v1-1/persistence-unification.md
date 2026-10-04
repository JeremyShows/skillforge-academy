# Persistence unification

The public platform envelope is `skillforge-platform-learner-v1`, schema version 1. It carries legacy learner state, installed package identity metadata, course progress, classroom/lecture/lab slots, and timestamps. Browser storage uses the versioned learner-state store with a recoverable backup key. Tauri registers keyed `load_course_state`, `save_course_state`, and `reset_course_state` commands backed by bounded atomic `platform-state.json`.

Encrypted backup export/import now wraps this envelope while raw legacy `.apexbackup` JSON still imports into `legacyState`.

Automated coverage verifies slot preservation across progress, Classroom, Lecture, Labs, encrypted export/import, and legacy raw backup import.
