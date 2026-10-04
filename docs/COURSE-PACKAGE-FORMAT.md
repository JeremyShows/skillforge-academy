# SkillForge Course Package V1.1

The canonical public contract is [skillforge-course-v1.schema.json](../schemas/skillforge-course-v1.schema.json). Contract-owned objects use strict unknown-field rejection; package extensions belong only in `extensionMetadata`.

The contract carries the complete authored hierarchy, rich activity and mastery fields, lecture segment kinds, academic catalog records, instructor configuration, and deterministic lab state-machine data. Lab effects preserve `set`, `increment`, and `append`; formal-activity steps retain their activity identity.

Schema SHA-256 (2026-10-04): `2D81D5D34DE875C6EE29FAE4B34D396B596AD2456C11DDD893B69D182A41B72C`.

Version fields use strict major.minor.patch grammar with optional prerelease identifiers. Registry updates compare numeric core versions and prereleases semantically.

