# Lecture model parity

Lecture packages use the public `LectureCatalog` directly. The catalog preserves course/module/lesson identity, lecture metadata, explicitness, all segment fields, uppercase segment types, the complete authored content union, references, prompts, interaction semantics, and required flags. Only the legacy `text` and `choice` interaction spellings are normalized at JSON parse boundary; the canonical object validator rejects them.
