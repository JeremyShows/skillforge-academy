# Schema and validator conformance

The canonical schema now has strict named definitions for instructor,
activities/mastery rules, assessments, lecture content/interactions, academic
surfaces, Labs, assets, and migrations. `extensionMetadata` is the only open
extension point. The public test checks strict definition flags and exercises
unknown instructor mode and asset fields against the TypeScript validator.
