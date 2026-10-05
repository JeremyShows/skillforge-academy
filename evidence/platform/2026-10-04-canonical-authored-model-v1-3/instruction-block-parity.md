# Instruction block parity

The validator recognizes only `prose`, `code`, `comparison`, `timeline`, `trace`, `failure-trace`, `measurement`, `decision`, and `callout`. Each variant has an explicit field set. Unknown block types and unknown fields are rejected; no generic record is accepted as a block.
