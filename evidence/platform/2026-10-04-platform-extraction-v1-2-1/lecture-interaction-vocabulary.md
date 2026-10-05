# Lecture interaction vocabulary

The canonical vocabulary is exactly:

`none | free-response | prediction | question`

The validator rejects unknown values and rejects legacy aliases at the direct canonical boundary. The explicit parse boundary may migrate legacy `text` to `free-response` and `choice` to `question`; the resulting document is canonical before runtime construction. The public lecture runtime and browser surface use the canonical values.
