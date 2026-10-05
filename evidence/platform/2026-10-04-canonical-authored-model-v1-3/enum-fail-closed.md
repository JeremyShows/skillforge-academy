# Enum and unknown-field fail-closed evidence

The validator rejects unknown course, activity, instruction-block, lecture, interaction, instructor-mode, academic, lab, capability, migration, visibility, and asset enums. It rejects unknown object fields at the package and authored-surface boundaries. JSON parsing performs only the documented lecture interaction alias migration before validation.

Covered by the canonical parity and package validation tests.
