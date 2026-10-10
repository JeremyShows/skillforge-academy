# Changelog

All notable changes to SkillForge Academy are documented here. SkillForge Academy was previously developed under the working name Apex A+ Academy.

## Unreleased

The latest published release is v1.3.2. The repository's current 1.4.1-beta.1 label identifies an unpublished candidate; the 1.4.0 entry below is also an unpublished local candidate. See the [release page](https://github.com/ForgeWireLabs/skillforge-academy/releases) and [v2.0 beta readiness report](docs/v2.0-beta-readiness.md).

### Added

- **Pre-beta candidate `1.4.1-beta.1`.** Frozen Windows NSIS installer metadata,
  SHA-256, pilot runbook, and AT cohort exclusion documented under `docs/`.
  Remote GitHub Actions Windows gate blocked by account billing lock.
- **Primary vs Tools navigation.** Sidebar splits the study loop (Learn / Practice / Mock / Recall) from Tools (PBQ, Performance, Notes, Preferences). Command Center is leaner; Mock results offer a weak-domain drill CTA.
- **Scoped practice drills.** Command Center weak-domain recommendations and Learning Paths “Practice this domain” now open Practice Lab filtered to that domain. UX/IA audit recorded in `audits/AUDIT-2026-07-20-ux-ia.md`.
- **Privacy and security review.** Documented local-data, backup crypto, diagnostics, and permission expectations in `docs/privacy-security.md`, with hardening for backup/state size limits, crypto-parameter checks, a packaged CSP, and a narrowed Tauri capability set (removed unused opener plugin / `export_state`).
- **Support and troubleshooting guide.** User-facing recovery docs cover SmartScreen/install, launch, content loading, backup restore, data locations, reset, diagnostics, and Android/iOS notes. Linked from the README installer section — see `docs/support-troubleshooting.md`.
- **Local diagnostics export.** Preferences can export a `skillforge-diagnostic-*.json` file for support. The app still sends no telemetry and no crash reports. Display name and note text stay redacted unless you explicitly opt in. Diagnostics include a deterministic `content.revision` fingerprint. See `docs/diagnostics.md` and decision 0009.
- **Verification remediation.** Tauri `load_content` now returns `objectives` (Learning Paths no longer crash on the desktop path); Mock weakest-domain remediation preserves fractional PBQ credit; content revision lands in diagnostic exports.

## 1.4.0 - 2026-06-22

Release status: unpublished local Windows release candidate. It is not a GitHub release; see the release page for the latest published version.

### Added

- **Objective progress in Learning Paths.** Each domain now shows an "Exam objectives" panel listing every official sub-objective with its code, title, lessons-read count, questions-mastered count, and a progress bar; clicking an objective jumps to its first unread lesson. Lessons and knowledge checks are tagged with their objective code, the lesson reader shows the objective being studied, and the domain header tracks objectives mastered. Fully keyboard- and screen-reader-accessible.
- **Objective coverage heatmap in Performance.** The analytics view now includes a per-objective mastery heatmap for the active track: every official sub-objective appears as a color-coded cell (not started / weak / developing / mastered), grouped by domain, with a "X/Y mastered" summary. Hovering a cell shows the objective title and exact mastery; cells carry screen-reader labels.
- **Full objective-by-objective coverage across all three tracks.** Every published exam sub-objective (A+ 63, Network+ 25, Security+ 28 = 116) now has a dedicated lesson plus at least six practice questions mapped to it, verified against the official CompTIA objectives. The library now holds 770 questions and 150 lessons. Content validation enforces this coverage (`--strict-coverage`) and the registries are confirmed against the current exam versions (A+ V15 220-1201/1202, Network+ N10-009, Security+ SY0-701).
- **Objective-mapped curriculum backbone** — each track now has an objective registry (`src/content/<cert>/objectives.json`) covering every published exam sub-objective (116 total across A+, Network+, and Security+). Lessons, questions, flashcards, and PBQs can be tagged with an `objectiveId`, and `validate:content` reports objective-by-objective coverage (deep target: ≥1 lesson and ≥6 questions per objective) with a `--strict-coverage` gate. Objective lists are seeded from the public exam structure and flagged for confirmation against CompTIA's official objectives PDFs. See `decisions/0006-objective-mapped-curriculum.md`.
- **CompTIA Network+ (N10-009) and Security+ (SY0-701) tracks** — two additional certifications are now selectable from the track switcher, each objective-complete with original questions, flashcards, lessons, and performance-based questions spread across the exam domains. Every track's progress stays fully separate.
- **Fill-in / command-entry PBQs and expanded multi-select coverage.** PBQs now include typed command/value answers with normalized grading, alongside matching and ordering. Multi-select question coverage expanded across A+, Network+, and Security+.
- Multi-track availability and ordering: certification tracks can now declare an optional `order` and a `status` of `available` or `coming-soon` in the manifest. Coming-soon tracks are advertised in the track switcher and the all-tracks analytics overview, are not selectable, and are exempt from the required-bank content validation — so an upcoming track can be published on the roadmap before its content is authored.

### Changed

- The track switcher now uses a deterministic order (available tracks first, then by `order`, then by name) and groups coming-soon tracks under a "Coming soon" heading.
- Trademark/affiliation disclaimers on the dashboard and preferences now derive the vendor from the active track instead of hardcoding CompTIA/A+, so shared UI stays correct across tracks.
- The app now falls back to the first available track if a saved active track is missing or has become coming-soon.
- Each track now carries a SkillForge mock-exam practice benchmark. These raw percentages are product heuristics, not official vendor passing percentages or conversions of scaled scores.

## 1.3.2 - 2026-06-14

### Added

- Lessons ("classes") in Learning Paths: each domain now includes short, original lessons that teach the material before the knowledge checks — 36 lessons across all nine A+ domains, with read/unread tracking and per-domain progress.

## 1.3.1 - 2026-06-14

### Changed

- The installer now removes a previous **Apex A+ Academy** installation before installing instead of leaving it alongside the new app. Your learner data, settings, and backups are preserved (the data location is unchanged).

## 1.3.0 - 2026-06-14

### Changed

- Renamed the product to **SkillForge Academy** (previously Apex A+ Academy). Existing learner data, settings, and encrypted backups carry over unchanged — the app-data location, browser storage key, and backup format are preserved.

### Added

- Multi-certification architecture: a certification manifest, per-track content directories, and a sidebar track switcher (CompTIA A+ is the first track).
- Per-certification progress — streaks, daily goals, and exam dates are tracked independently per track.
- All-tracks analytics overview alongside the per-track performance views.
- Exam toggles and mock-exam defaults are now driven by the certification manifest rather than hardcoded exam codes.

## 1.2.1 - 2026-06-14

### Added

- Dedicated PBQ Lab for standalone matching and ordering simulations
- Passphrase-protected AES-256-GCM backups for private cross-device transfer, with legacy JSON import support
- Custom mock exam question counts, PBQ counts, and time limits
- Automated Windows tag builds, draft GitHub releases, and SHA-256 checksum uploads
- Ten original questions, ten flashcards, and two additional PBQ scenarios
- Automated accessibility affordance validation

### Accessibility

- Skip-to-content navigation, labelled primary navigation and content regions, current-page semantics, visible focus rings, and Escape handling for transient overlays

### Performance

- Split charting dependencies and the Analytics screen into separate production chunks, removing the oversized initial-bundle warning

## 1.2.0 - 2026-06-13

Headline: full-length timed mock exams and performance-based questions, deepening the A+ track.

### Added

- Full-length **mock exam** mode: domain-weighted question selection that mirrors the exam blueprint, a countdown timer that auto-submits at zero, no per-question feedback until submission, a SkillForge 75% practice benchmark, and an end screen with pass/fail, per-domain breakdown, and full review
- **Performance-based questions (PBQs)**: a new interactive question type with *matching* (assign items to categories) and *ordering* (sequence steps) formats, graded with partial credit, surfaced at the start of mock exams
- Expanded original A+ question bank to 78 questions plus 6 PBQs, with per-domain depth for realistic weighting
- Mock attempts are tracked separately in analytics with a PASS/FAIL marker

### Changed

- Content pipeline, validator, and desktop resource loading now cover PBQs

## 1.1.0 - 2026-06-14

Download: [v1.1.0 release](https://github.com/ForgeWireLabs/skillforge-academy/releases/tag/v1.1.0) (Windows x64 installer + SHA-256 checksum).

### Added

- Global `Ctrl+K` command palette across domains, objectives, questions, and flashcards
- Focused practice sessions launched from domain recommendations and learning paths
- Accurate per-day question activity and consecutive-day study streak tracking
- Study-status notification panel for daily goals, due cards, and exam countdown
- Portable JSON progress backup, restore, and reset controls in Preferences
- Recency- and coverage-based domain and per-objective mastery analytics
- SM-2 spaced-repetition scheduling for flashcards, with ease and lapse tracking
- Question and flashcard banks moved to validated JSON loaded by the desktop backend (54 questions, 26 cards)
- Automated unit tests for scoring, streaks, scheduling, mastery, and state migration

### Fixed

- Daily mission progress no longer uses lifetime question totals
- Study streak now advances and resets correctly instead of holding a fixed value
- Bookmark controls now toggle instead of only adding items
- Checked practice answers can no longer be changed after revealing the explanation
- Practice answer options are shuffled to prevent positional memorization
- Saved learner state is validated and migrated on load, tolerating older or corrupt files

### Accessibility

- aria-labels on icon-only controls, keyboard-operable flashcards, and focus management on view changes

## 1.0.0 - 2026-06-13

- Initial Windows desktop release with learning paths, practice sessions, flashcards, analytics, notes, bookmarks, themes, local persistence, and NSIS packaging
