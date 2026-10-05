# Cross-runtime conformance contract

This closure defines the public package boundary as serialized canonical bytes. A producer may author an in-memory object, but the public runtime receives only `serializeCoursePackage` output and reconstructs a `CourseRuntimeContext` through `parseCoursePackage` and `packageToCourse`.

The conformance suite covers instructional completion, retrieval practice, formal mastery failure, remediation, valid retry, module assessment failure, capstone/final assessment metadata, lecture delivery, academic record derivation, and deterministic lab state transitions. The public runtime must not import or name a private course implementation.

`formatVersion: 1` remains the contract because the package format is still pre-release and the private producer is controlled. The validator is intentionally tightened in this version; future incompatible changes require a new format version rather than silent acceptance.
