# Public validation gates

All gates below passed on the isolated public branch:

- `npm ci`
- `npm test -- --run` — 12 files, 163 tests passed; focused lecture bridge file has 34 passing tests
- `npm run validate:content`
- `npm run validate:a11y` — 20 checks passed
- `npm run build`
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `python -m repopact.cli validate`
- `git diff --check`

The Vite preview browser run is recorded in `browser-acceptance.json` and
explicitly covers first-pass success, fail/remediate/retry, and completed UI
closure. The README and platform/package documentation were updated in the
same follow-up.
