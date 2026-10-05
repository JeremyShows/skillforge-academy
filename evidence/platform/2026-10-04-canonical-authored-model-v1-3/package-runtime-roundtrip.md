# Package/runtime round-trip

`serializeCoursePackage` is stable-key deterministic. `parseCoursePackage(serializeCoursePackage(package))` validates successfully and preserves the authored `Course` value. Runtime context construction exposes the same course, lecture catalog, academic catalog, and lab catalog without lossy reconstruction.

Evidence command: `npm test -- --run` — 11 files, 129 tests passed.
