# 310 — Pre-beta candidate refresh and operational readiness gate

> **Status**: Active
>
> Bounded gate before activating the real learner beta (`228`). Not a product
> feature pass.
> **Owners**: Steward / Release lead; Desktop, QA, and Accessibility Specialists
> support.
> **Depends on**: 219, 220, 221, 222, 225, 226, 227, 308, 309.

## Intent

The application is functionally ready enough to test with learners, but the
**artifact and pilot process are not yet pinned down**. Current `main` still
reports as `1.4.0` while carrying substantial Unreleased work since the June 22
RC, so a newly built installer is not uniquely identifiable against the audited
June artifact. Diagnostics fingerprint content revision, not application source
commit.

This item creates a uniquely identifiable beta candidate, freezes and validates
the exact Windows installer, records acceptance and CI evidence, decides the
NVDA/AT posture for the first cohort, and publishes a controlled pilot runbook.
Once green, `228` is the correct next item—no further product feature work
should be inserted between them.

## Out of scope

- Full line-by-line content review (calibration belongs to `228`).
- Additional certification tracks.
- Visual polish / P2–P3 UX follow-ups (useful as beta findings).
- iOS or Android inclusion in the first cohort.
- Public mass distribution or publisher reputation claims.
- Waiting on code signing (`212`) for a small private Windows beta.

## Decisions

1. **Version string:** RepoPact 2.3.0 keeps `VERSION` as `1.4.1` and puts maturity
   in optional `RELEASE_LABEL` (`1.4.1-beta.1`, decision 0026). Product/installer
   surfaces (`package.json`, Tauri, diagnostics) use that same label.
2. **Build identity:** Vite injects `__APP_BUILD__` from `git rev-parse --short HEAD`
   (override with `SKILLFORGE_BUILD`). Diagnostics expose `app.build` alongside
   `app.version`.
3. Whether the first beta is AT-qualified (NVDA) **or** explicitly not — pending
   AC-5.
4. Stop-the-pilot conditions — pending AC-6 runbook.

## Scope

- Version / identity surfaces (`package.json`, `VERSION`, Tauri, diagnostics).
- Frozen Windows installer + checksum / metadata record.
- Local + remote Windows gate evidence against the frozen commit.
- Packaged-app acceptance notes.
- Accessibility decision record (pass or controlled-beta exclusion).
- Pilot distribution / privacy / severity / stop-condition runbook.
- Governance: `228` dependency reconciliation, roadmap/audit pointers.

## Suggested packaged-app acceptance checklist

1. Clean install and SmartScreen path.
2. First-run tour.
3. Select A+, then switch to Network+ and Security+.
4. Open a lesson and mark progress.
5. Launch a domain-scoped Practice session.
6. Complete and review Practice.
7. Use every PBQ type.
8. Start and complete a short Mock exam.
9. Confirm weakest-domain remediation opens the correct drill.
10. Rate Recall cards.
11. Create a note and bookmark.
12. Close and reopen; verify persistence.
13. Export an encrypted backup.
14. Change learner state.
15. Import the backup and verify restoration.
16. Export diagnostics and verify version, build, content revision, redaction,
    and error context.
17. Uninstall/reinstall or upgrade and confirm data behavior.

## Closeout

Close when all acceptance criteria have evidence, the candidate artifact is
retained unchanged for pilot round one, and `228` is unblocked to activate.
Do not treat automated a11y validation as a substitute for the real NVDA
walkthrough unless AC-5 records an explicit non-AT-qualified cohort scope.

**Progress (2026-07-20):** AC-1 identity, AC-2 frozen installer metadata, AC-5
AT exclusion, AC-6 runbook, and AC-7 governance reconciliation are done. AC-3
remote Windows CI is waived/blocked on GitHub billing (local gates green).
**Remaining:** AC-4 packaged-app interactive acceptance on the frozen installer.

## Candidate and readiness separation (2026-10-09)

The artifact and evidence above identify the historical `1.4.1-beta.1`
candidate at source commit `ca6d5b6d11741b3d7fc2890976ee5005c330b735`. Its
identity, checksum, local gates, and runbook remain useful historical evidence
for that exact binary only. They do not qualify a v2.0.0-beta.1 candidate.

WI310 is still active: AC-4 packaged-app acceptance remains pending, and AC-3's
remote Windows CI limitation is recorded as waived with its billing blocker.
The pilot gate is therefore not green. Any later candidate requires a new
source commit, installer, checksum, build/CI run, installed-app acceptance, and
release evidence under its own candidate identity. WI228 must not be activated
until WI310 and the separate WI333 privacy gate are complete.
