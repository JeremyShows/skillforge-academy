# SkillForge Academy — Multi-Certification Architecture Plan

> **Status: HISTORICAL — implemented and superseded.** This is the original
> design document (2026-06-14). All five phases, including Phase 3 (Network+ and
> Security+ content + brand pass), have shipped, and all three tracks are
> objective-complete. It is preserved for design rationale, not as current
> state. For the implemented reality see: `CHANGELOG.md` (shipped behavior),
> `docs/certification-authoring.md` (how to add a track), `ROADMAP.md` (current
> tracks), the `work/` queue (live work), and `audits/` (verification —
> including `AUDIT-2026-06-20-multi-cert-plan-reconciliation.md`, which records
> this reconciliation). Note: several inline file paths and line numbers below
> reflect the pre-split layout (A+ banks at `src/content/*.json`, the `ExamCode`
> union, original `lib.rs`/`App.tsx` lines) and are stale — content now lives
> under `src/content/<cert>/`, `ExamCode` was retired for `ExamId`, and the type
> manifest gained `idPrefix`/`order`/`status` fields not shown in §2.1.

**Status:** Draft for review · **Date:** 2026-06-14
**Decisions locked in:** (1) single app with a track picker, not separate editions;
(2) CompTIA stack first — A+ → Network+ → Security+; (3) **per-cert** progress
(streaks included); (4) an **all-tracks** analytics overview from day one; (5)
**umbrella branding** — "SkillForge Academy" with named tracks ("A+ Track", "Network+ Track").

**Done ahead of the rest of the plan (the "gotcha"):** all A+ content ids are now
namespaced under `aplus-` and a v2→v3 re-key migration preserves existing learner
progress. See §2.3.

This document defines the **target data model** and a **lossless migration** that turns
"Apex A+ Academy" into "SkillForge Academy," with A+ as the first of several certification
*tracks*. (Originally design-only; since implemented across all phases — see the historical banner above.)

---

## 1. Guiding principles

1. **A+ becomes data, not types.** The hardcoded `ExamCode = "220-1201" | "220-1202"`
   union ([src/types.ts:1](../src/types.ts)) is the root of the coupling (~93 references).
   We replace it with string ids resolved against a certification manifest.
2. **Lowest-risk migration wins.** Question/card/PBQ ids are already globally unique and
   self-describing (each item carries its `domain` and `exam`). That means most learner
   progress (`answered`, `cardRatings`, `attempts`, `bookmarks`) stays valid *as-is* — we
   scope it by filtering content, not by re-bucketing saved data.
3. **A+ keeps working end-to-end at every phase.** No phase leaves the app broken.

---

## 2. Target data model

### 2.1 New: certification manifest

```ts
// types.ts
export type CertId = string;   // "a-plus", "network-plus", "security-plus"
export type ExamId = string;   // "220-1201", "n10-009", "sy0-701"  (was ExamCode)

export interface ExamMeta {
  id: ExamId;
  certId: CertId;
  name: string;            // "Core 1", "Core 2", or "" for single-exam certs
  defaultQuestions: number;// mock-exam default (was MOCK_DEFAULT_QUESTIONS)
  defaultMinutes: number;  // mock-exam default (was MOCK_DEFAULT_MINUTES)
}

export interface Certification {
  id: CertId;
  name: string;            // "CompTIA A+"
  shortName: string;       // "A+"
  vendor: string;          // "CompTIA"
  description: string;
  exams: ExamMeta[];       // A+ has 2; Network+/Security+ have 1
  passThreshold: number;   // default 0.75 (was MOCK_PASS)
}
```

A+ multi-exam shape is the **general** case; single-exam certs are just `exams.length === 1`.
The hardcoded exam arrays in [App.tsx](../src/App.tsx) (lines ~218, ~304, ~370) and
`MOCK_*` constants in [logic.ts](../src/logic.ts) become reads off this manifest.

### 2.2 Changed: content entities gain a cert dimension

```ts
export interface Domain   { certId: CertId; id; exam: ExamId; name; weight; color; description; topics }
export interface Question { certId: CertId; id; exam: ExamId; domain; difficulty; ... }
export interface Pbq      { certId: CertId; ... }   // both Matching/Ordering variants
export interface Flashcard{ certId: CertId; id; domain; front; back }   // gains certId (currently has neither cert nor exam)
```

`exam`'s **type** changes (`ExamCode` → `ExamId`) but the field stays. We add `certId` so
filtering never has to round-trip through the manifest in hot paths.

### 2.3 ID uniqueness rule — DONE

`answered` / `cardRatings` are keyed by item id, and `domains.find(d => d.id === …)` assumes
unique domain ids. A+ previously used **unprefixed** ids (`mobile`, `networking`, `os`), which
would collide with Network+ (it also has a "networking" domain).

**Rule (now enforced):** every cert prefixes *all* its content ids with the cert short-slug.
A+ is no exception — it now uses `aplus-mobile`, `aplus-q01`, `aplus-p01`, etc. New certs follow
suit (`netplus-networking`, `secplus-sy0-q001`). This was done now, while A+ is the only track
and the migration is cheapest, rather than grandfathering A+ and carrying a permanent
prefixed/unprefixed split.

**What shipped for this:**
- A structural transform prefixed the top-level `id` and `domain` fields across
  `src/content/<track-id>/domains.json`, `src/content/<track-id>/questions.json`, `src/content/<track-id>/flashcards.json`, and `src/content/<track-id>/pbqs.json`.
  Nested PBQ item/target/step ids (local to each PBQ) were intentionally left untouched.
- `SCHEMA_VERSION` bumped to **3**; `migrateState` ([logic.ts](../src/logic.ts)) re-keys any
  pre-v3 save — `answered`, `cardRatings`, `bookmarks`, and `attempts[].domainScores` — by
  prefixing bare ids with `aplus-`. Idempotent (won't double-prefix) and version-gated, so
  encrypted/legacy backups upgrade losslessly on import. Covered by new tests in
  [logic.test.ts](../src/logic.test.ts).
- The one code literal that hardcoded domain ids ([App.tsx:218](../src/App.tsx)) was updated.

**Done in Phase 0:** [validate.ts](../src/content/validate.ts) and
[validate-content.mjs](../scripts/validate-content.mjs) now *enforce* the prefix convention,
validate every `certId`/`exam` against the manifest, and check cross-bank id uniqueness.

### 2.4 Content file layout

```
src/content/
  certifications.json          # Certification[] manifest
  a-plus/
    domains.json  questions.json  pbqs.json  flashcards.json   # moved, unchanged content
  network-plus/
    domains.json  questions.json  pbqs.json  flashcards.json
  security-plus/
    ...
```

`ContentBundle` aggregates all tracks in memory (arrays stay flat, tagged by `certId`), plus
the manifest — so `logic.ts` functions keep working on flat arrays with a `.filter(certId)`:

```ts
export interface ContentBundle {
  certifications: Certification[];
  domains: Domain[];     // all certs
  questions: Question[];
  flashcards: Flashcard[];
  pbqs: Pbq[];
}
```

**Rust loader** ([src-tauri/src/lib.rs:64](../src-tauri/src/lib.rs)): read `certifications.json`,
then for each cert id read its four files and concatenate, injecting `certId` from the dir name
if an item omits it. **Bundled fallback** ([src/content/index.ts](../src/content/index.ts)):
static imports per cert dir, same concatenation. PBQs stay optional (older dirs still load).

---

## 3. Learner state & progress partitioning

**Chosen approach (per decision 3): per-cert progress, including per-cert streaks.** Each track
keeps its own streak, daily goal, daily counts, and exam date in a per-cert bucket. The id-keyed
maps (`answered`, `cardRatings`) stay **flat** — now that every id is cert-prefixed (§2.3), a
track's slice is just `Object.entries(...).filter(([id]) => id.startsWith(certPrefix))`, and the
**all-tracks** views (decision 4) are the unfiltered whole. So flat storage gives us *both* the
per-cert and aggregate views for free, without re-bucketing the id maps.

```ts
export interface CertProgress {          // NEW — one bucket per track
  targetDate: string;                    // each exam has its own date
  streak: number;
  lastStudyDate: string;
  dailyGoal: number;
  dailyCounts: Record<string, number>;   // keyed YYYY-MM-DD, per cert
}

export interface LearnerState {
  schemaVersion: 3;                       // was 2
  name: string;
  theme: "dark" | "light";

  activeCertId: CertId;                   // NEW — which track is in focus
  progress: Record<CertId, CertProgress>; // NEW — per-cert streak/goal/counts/date

  // Flat + cert-prefixed ids → filter for per-cert, whole for all-tracks:
  answered: Record<string, AnsweredStat>;
  cardRatings: Record<string, CardSchedule>;
  attempts: Attempt[];                    // Attempt gains certId (see below)
  bookmarks: string[];
  notes: { id; title; body; updatedAt }[];// unchanged (cert-agnostic)
}
```

The top-level `streak`/`lastStudyDate`/`dailyGoal`/`dailyCounts`/`targetDate` from v2 fold into
`progress["a-plus"]`. `Attempt` ([src/types.ts:63](../src/types.ts)) gains `certId: CertId`; its
`exam: ExamCode | "Mixed"` becomes `exam: ExamId | "Mixed"`.

> **Status:** DONE. Both halves of the v3 migration shipped — the id re-key (§2.3) and this
> per-cert `progress` restructure. `LearnerState` now carries `activeCertId` + `progress`, each
> `Attempt` carries `certId`, and the dashboard/notifications/analytics are cert-scoped. Because
> v3 was unreleased, it all lands as a single v2→v3 migration; users upgrade once.

### Derived views: per-cert and all-tracks

Pure functions in `logic.ts` need no signature change — callers pass pre-filtered arrays:

- Dashboard readiness, domain mastery, "next focus" → filter by the **active** cert.
- `buildNotifications` → cards-due / daily-goal / exam-countdown read the active cert's bucket.
- Analytics → **two modes from day one**: per-track score history, and an all-tracks overview
  (combined readiness, streak-per-track, attempts across certs).

---

## 4. Migration (schema v2 → v3)

All changes are **additive and lossless.** Existing users keep every point of progress; it
simply becomes their *A+ track* progress. The migration has two halves under one version bump:

**Done — id re-key** (in [logic.ts](../src/logic.ts) `migrateState`):

```ts
const fromVersion = num(data.schemaVersion, 0);
const certKey = (id) => (fromVersion < 3 && !id.startsWith("aplus-") ? `aplus-${id}` : id);
// applied to answered keys, cardRatings keys, bookmarks, and attempts[].domainScores keys
```

**Done — per-cert fold-in** (Phase 1, same v3):

```ts
const activeCertId = str(data.activeCertId, "a-plus");
// v2 top-level streak/goal/counts/date collapse into the A+ progress bucket
const progress = obj<CertProgress>(data.progress);
if (!progress["a-plus"]) progress["a-plus"] = {
  targetDate: str(data.targetDate, ""),
  streak: num(data.streak, 0),
  lastStudyDate: str(data.lastStudyDate, ""),
  dailyGoal: num(data.dailyGoal, initialState defaultGoal),
  dailyCounts: <existing dailyCounts>,
};
// each legacy attempt belongs to A+: attempts.map(a => ({ ...a, certId: a.certId ?? "a-plus" }))
```

- **Backups:** [backup.ts](../src/backup.ts) encrypts the serialized state and import routes
  through `migrateState`, so existing encrypted *and* legacy-JSON backups upgrade for free.
- `SCHEMA_VERSION` is `3` ([logic.ts:3](../src/logic.ts)); `initialState` carries
  `activeCertId: "a-plus"` and a seeded `progress["a-plus"]` bucket.

---

## 5. Phasing (each phase is independently shippable)

| Phase | Scope | Key files |
| --- | --- | --- |
| **0 — Scaffold** ✅ **DONE** | Added manifest + cert types; moved A+ banks into `a-plus/` (stamped `certId`); Rust loader walks cert dirs; bundled fallback imports per-cert; validation is manifest-driven (cert/exam refs + prefix + uniqueness). A+ is still the only track and the app behaves identically. | `types.ts`, `content/index.ts`, `content/validate.ts`, `lib.rs`, `scripts/validate-content.mjs`, `certifications.json`, `tauri.conf.json` |
| **1 — State** ✅ **DONE** | Migrated to schema v3 `progress` buckets + `activeCertId`; `Attempt.certId`; per-cert `applyStudyActivity`/`questionsToday`; cert-scoped dashboard, notifications, analytics; all-tracks overview panel. A+ still the only track. | `logic.ts`, `App.tsx`, `Analytics.tsx`, `logic.test.ts`, `types.ts` |
| **2 — UI** ✅ **DONE** | Sidebar track switcher sets `activeCertId` (cert-stateful views keyed to remount on switch); Learn/Practice/PbqLab/Mock exam toggles and mock defaults read from `cert.exams`; Practice/Mock/PbqLab/Flashcards/CommandPalette pools scoped by active track. `ExamCode` retired in favor of `ExamId`. `View` type unchanged. | `App.tsx`, `styles.css`, `types.ts`, `logic.ts` |
| **3 — Content + brand** ✅ **DONE** | Authored Network+ (`N10-009`) and Security+ (`SY0-701`) banks — both objective-complete; brand pass shipped: product name, window title, `tauri.conf.json`, README, icon all read "SkillForge Academy". | `content/network-plus/*`, `content/security-plus/*`, README, Tauri config |

Phases 0–2 shipped with A+ only and zero user-visible change beyond the track picker — they were
pure de-risking. Phase 3 is where "SkillForge Academy" became multi-cert; it has shipped, and the
content depth went beyond the original "starter track" intent — all three tracks are now
objective-complete (every published exam objective has a lesson and a mapped practice set).

---

## 6. Hardcoded sites to retire (reference)

- [types.ts:1](../src/types.ts) — `ExamCode` union → `ExamId` + manifest types
- [validate.ts:10](../src/content/validate.ts) — `EXAM_CODES`/`DIFFICULTIES` consts → derive from manifest; add global-id-uniqueness check
- [logic.ts:169-171](../src/logic.ts) — `MOCK_PASS`/`MOCK_DEFAULT_*` → per-cert/per-exam manifest values
- [logic.ts:181,205](../src/logic.ts) — `buildWeightedQuestionSet`/`buildMockExam` `exam` param type → `ExamId`
- [App.tsx ~218](../src/App.tsx) — Learn-view segmented Core 1/Core 2 toggle → `cert.exams.map`
- [App.tsx ~304](../src/App.tsx) — PBQ `["All","220-1201","220-1202"]` picker → manifest
- [App.tsx ~370](../src/App.tsx) — Mock `["220-1201","220-1202"]` picker → manifest
- [lib.rs:64,97](../src-tauri/src/lib.rs) — content loader (dir walk) and panic message

---

## 7. Resolved decisions

1. **Streak scope:** ✅ per-cert (each track has its own streak/goal/counts). See §3.
2. **Analytics:** ✅ per-track *and* an all-tracks overview from day one. See §3 derived views.
3. **Branding:** ✅ "SkillForge Academy" umbrella; tracks named "A+ Track", "Network+ Track",
   "Security+ Track". Drives copy/icon work and the Phase 3 product-name pass.
4. **ID uniqueness:** ✅ fixed up front — all ids cert-prefixed, A+ included. See §2.3.

5. **Track ordering / "coming soon":** ✅ resolved in work item `005`. The
   `Certification` manifest gained optional `order` and `status`
   (`available` | `coming-soon`) fields. Ordering is deterministic
   (`sortCertifications`: available first, then `order`, then name). Coming-soon
   tracks are advertised in the switcher and analytics overview, are not
   selectable, and are exempt from required-bank validation so the roadmap can be
   published before content exists. The app resolves a safe active track when a
   saved `activeCertId` is missing or coming-soon. See
   `docs/certification-authoring.md` → *Track Availability*.

### Smaller things still to confirm during build

- Whether the **all-tracks overview** is its own view or a toggle inside Analytics.
  (Currently an inline panel in Analytics, shown only when ≥2 tracks exist.)
