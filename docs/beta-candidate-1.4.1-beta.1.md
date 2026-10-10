# SkillForge Academy 1.4.1-beta.1 Pre-Beta Candidate

Date: 2026-07-20
Status: local frozen candidate for WI 310 / private pilot prep.
Related work: `310`

## Identity

| Surface | Value |
| --- | --- |
| `VERSION` | `1.4.1` |
| `RELEASE_LABEL` | `1.4.1-beta.1` |
| `package.json` / Tauri / Cargo | `1.4.1-beta.1` |
| Diagnostics `app.version` | `1.4.1-beta.1` |
| Diagnostics `app.build` (build-time) | `ca6d5b6` (`SKILLFORGE_BUILD`) |
| Source commit (full) | `ca6d5b6d11741b3d7fc2890976ee5005c330b735` |
| Content revision | `fnv1a-78e5d93f` |

## Artifact

Keep this exact binary for pilot round one. Do not rebuild and redistribute a
different hash under the same candidate label.

```text
Filename: SkillForge Academy_1.4.1-beta.1_x64-setup.exe
Retained path: artifacts/beta-1.4.1-beta.1/SkillForge Academy_1.4.1-beta.1_x64-setup.exe
Conventional mirror: src-tauri/target/release/bundle/nsis/SkillForge Academy_1.4.1-beta.1_x64-setup.exe
Size (bytes): 2336892
SHA-256: fac057f6e3ed478160845c2b5793734ce04bd388d98458bcfd819253225b15b8
Checksums file: artifacts/beta-1.4.1-beta.1/SHA256SUMS.txt
Signed: No (Authenticode NotSigned; WI 212 still blocked)
```

Verify in PowerShell:

```powershell
Get-FileHash ".\artifacts\beta-1.4.1-beta.1\SkillForge Academy_1.4.1-beta.1_x64-setup.exe" -Algorithm SHA256
```

## Build environment

- Platform: Microsoft Windows NT 10.0.19045.0 (AMD64)
- Node: v24.15.0 / npm 11.12.1
- Rust: rustc 1.96.0 (ac68faa20 2026-05-25) / cargo 1.96.0
- Command: `$env:SKILLFORGE_BUILD='ca6d5b6'; npm run desktop:build`
- Bundler: Tauri NSIS x64
- Signing secrets: unset

## Local gates (candidate commit)

Run against `ca6d5b6` / working tree built from that tip:

- `npm run validate:content` — pass
- `npm run validate:a11y` — pass (20 checks)
- `npm test -- --run` — pass (89)
- `npm run build` — pass
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml` — pass
- `cargo check --manifest-path src-tauri/Cargo.toml` — pass
- `npm run desktop:build` — pass (installer produced)

## Remote Windows CI

Workflow dispatch of `.github/workflows/release.yml` on `main` @ `ca6d5b6`:

- Run: no public run URL; the dispatch failed before a public workflow run was created.
- Result: **failed before start** — GitHub annotation: account locked due to a billing issue
- Consequence: remote Windows CI evidence is unavailable until billing unlocks
- Residual risk: private pilot may proceed on local Windows gate evidence; public recruitment should wait for green remote CI

## Publication

Do **not** claim public GitHub release for this candidate. Distribution is direct
installer + published checksum for an invited private cohort only. See
[Pilot Runbook](pilot-runbook-1.4.1-beta.1.md).
