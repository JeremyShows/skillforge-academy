# Course Studio Architecture Handoff

Course Studio V1 must author the exact canonical package models consumed by the
learner runtime. It must not create a Studio-only curriculum model followed by
a lossy conversion.

## Future Build mode

Build mode should provide New Course, course identity, units, lessons, lecture
sequencing, readings, deterministic labs, assignments, assessments/rubrics,
remediation, instructor profile, validation, Preview as Student, and package
export.

The authoring document is the package document. Every save can run the same
bounded validator used by package installation. Preview loads the in-memory
validated document through the same `CourseRuntimeContext` used by Learn mode.

## Authority and safety

Studio authors declarations; the platform owns runtime behavior and academic
authority. Provider configuration is installation-level. Studio cannot add
scripts, commands, native plugins, arbitrary URLs, paths, or secrets to a
package.

The full builder is intentionally not implemented in Platform V1. This document
is the concrete next-work-item target.

