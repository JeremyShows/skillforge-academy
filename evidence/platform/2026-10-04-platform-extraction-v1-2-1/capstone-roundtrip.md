# Capstone and final-assessment round trip

The canonical package contract carries `course.capstone` and `course.finalAssessment`, including identifiers, source locations, activity/source IDs, pass scores, integration flags, response semantics, mastery rubrics, and per-stage rubrics. The public adapter reconstructs those fields into the generic course runtime without replacing stage rubrics with empty arrays.

The platform package validation tests cover stage-rubric presence and rejection. The cross-runtime suite asserts capstone and final-assessment identity after serialization and parsing, and verifies that formal blank responses do not create mastery evidence.
