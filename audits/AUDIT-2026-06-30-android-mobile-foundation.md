# AUDIT-2026-06-30-android-mobile-foundation

## Summary

- **Type:** implementation / mobile readiness
- **Status:** passed-with-emulator-caveat
- **Related work:** `217-tauri-android-mobile-support-foundation`
- **Date:** 2026-06-30
- **Reviewer:** Codex, Desktop/Mobile Specialist lane

## Scope

Prepared the repository for Tauri Android support, checked local host
prerequisites, documented Android information architecture and storage behavior,
and ran the standard non-Android validation gates available on this Windows
host.

## Evidence

- `npm run tauri -- info` passed and reported Windows WebView2, MSVC, Rust,
  Node, npm, and Tauri package versions.
- `java -version` reported OpenJDK 17.0.19.
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` pointed at the configured Android SDK root.
- `sdkmanager --list_installed` reported Android Emulator, platform-tools, and
  the Android 35 x86_64 system image.
- `npm run tauri -- android init --ci` failed with
  `Android NDK not found. Make sure the NDK is installed and the NDK_HOME
  environment variable is set.`
- `sdkmanager "platforms;android-35" "build-tools;35.0.0"
  "ndk;27.2.12479018" "cmake;3.22.1"` failed after a connection reset while
  preparing CMake.
- `sdkmanager "ndk;26.3.11579264"` created a partial NDK directory but did not
  register an installed package or produce `source.properties`.
- `npm run mobile:android:init` then failed while reading the partial NDK:
  Tauri failed while reading the partial NDK `source.properties` file.
- `npm run validate:content`, `npm run validate:a11y`, `npm test -- --run`,
  `npm run build`, `cargo fmt --check --manifest-path src-tauri/Cargo.toml`,
  and `cargo check --manifest-path src-tauri/Cargo.toml` passed.

## Findings

### Addressed: Android CLI entry points

`package.json` now exposes Tauri Android scripts for initialization, dev launch,
Android Studio handoff, and APK builds.

### Addressed: mobile dev-server host support

`vite.config.ts` now honors `TAURI_DEV_HOST` and configures HMR when Tauri
mobile dev commands provide a device-reachable host.

### Addressed: Android product stance

`docs/android-mobile.md` records the Tauri-only mobile architecture, host
prerequisites, commands, small-screen information architecture, storage stance,
backup handoff expectations, and post-init validation checklist.

### Addressed: phone-width usability rules

The CSS now adds a stricter phone breakpoint for stacked controls, full-width
PBQ inputs/selects, touch-sized PBQ ordering buttons, stacked review/actions,
single-column flashcard ratings, notes editor behavior, and viewport-constrained
menus/dialogs.

### Blocked: Android project initialization and runtime validation

The Android target could not be initialized because the local SDK lacks a
complete registered NDK. Android launch, offline content proof, persistence
proof, encrypted backup file handoff, and APK output remain unvalidated until
the NDK install succeeds.

## Acceptance Criteria Status

| AC | Status | Notes |
| --- | --- | --- |
| AC-1 | Blocked | Tauri Android init was attempted but blocked by missing/incomplete NDK. |
| AC-2 | Satisfied | Android CLI scripts and docs were added. |
| AC-3 | Blocked | Emulator/device launch cannot run until Android init succeeds. |
| AC-4 | Blocked | Offline content proof requires a runnable Android target. |
| AC-5 | Blocked | Android persistence proof requires a runnable Android target. |
| AC-6 | Satisfied | Android small-screen IA and phone-width touch rules are defined and patched. |
| AC-7 | Partially satisfied | Android storage/backup stance is defined; file handoff validation is blocked by Android init. |
| AC-8 | Partially satisfied | Standard local gates should be run after this audit; Android build gate is blocked by NDK. |

## Recommendation

Keep work item `217` blocked, not completed. The repository-side Android
foundation is in place, but the product acceptance criteria require a real
Tauri Android target and runtime proof. Resume by completing the Android NDK
install, then run `npm run mobile:android:init`, launch on an emulator/device,
validate offline content and learner state, and produce an APK.

## 2026-07-01 Retry Addendum

Related evidence: `evidence/runs/20260701-217-android-runtime-retry.json`.

- Moved stale partial NDK and build-tools directories aside after verifying they
  contained only installer metadata and no usable `source.properties`.
- `sdkmanager --list_installed` still lists only CMake, emulator,
  platform-tools, and the Android 35 x86_64 system image. It does not list
  `platforms;android-35`, `build-tools;35.0.0`, or `ndk;26.3.11579264`.
- Retried `sdkmanager` for the required platform/build-tools/NDK packages; the
  process stalled and left partial package-operation downloads.
- Direct downloads from Google's Android repository are reachable, but observed
  throughput was too slow for this run: the platform archive reached only about
  3.9 MB of 64.3 MB after roughly 2.5 minutes, and the required NDK archive is
  about 665 MB.
- `npm run mobile:android:init` still fails with `Android NDK not found. Make
  sure the NDK is installed and the NDK_HOME environment variable is set.`
- `adb devices` reported no connected/running devices. `emulator -list-avds`
  reports `forge_moto_one_hyper_lab_api35`, but runtime launch cannot proceed
  until the Android target is generated.

Updated recommendation: keep `217` blocked. The precise prerequisite is a
complete Android SDK install containing `platforms;android-35`,
`build-tools;35.0.0`, and `ndk;26.3.11579264`, with
  NDK `source.properties` file present.

## 2026-07-02 Runtime Proof Addendum

Related evidence: `evidence/runs/20260702-217-android-runtime-proof.json`.

- Installed the verified local Android NDK r26d archive into
  `$env:ANDROID_HOME` (the configured SDK root). The installed metadata reports
  `Pkg.Revision = 26.3.11579264` and `Pkg.ReleaseName = r26d`.
- `npm run mobile:android:init` passed and generated the Tauri Android project.
- Corrected the Android APK script to `tauri android build --apk`; the previous
  `tauri android build -- --apk` shape forwarded `--apk` to cargo.
- `npm run mobile:android:build` passed and produced an unsigned universal
  release APK.
- `npm run tauri -- android build --apk --target x86_64` passed for the
  Android 15 x86_64 emulator proof. The unsigned APK SHA-256 is
  `C86E2380DB4AE27E0B6997A10DFC1B54F1A229AA85B616A8B493341A5C927328`.
- Signed the x86_64 release APK with the local Android debug key for emulator
  install. The signed APK is
  `evidence/android/217-app-x86_64-release-debug-signed.apk`; SHA-256
  `DC10BD9A7637E2233721AD53CD7C6FF52DD8FF92FB134E2A73BC5B84E8F74C77`.
- Installed and launched the app on `emulator-5554`
  (`forge_moto_one_hyper_lab_api35`, Android 15 x86_64).
- Disabled Wi-Fi and mobile data before runtime checks. The app launched,
  cleared the splash screen, and loaded bundled A+, Network+, and Security+
  dashboard content offline.
- Verified active-track persistence by selecting Security+, force-stopping the
  app, relaunching it, and capturing Security+ still selected.
- Added a bounded mobile startup fallback so Android enters the app if the
  Tauri backend bridge stalls: content falls back to bundled JSON banks and
  learner state falls back to the existing `apex-state` localStorage key while
  still attempting backend saves.

Updated acceptance status:

| AC | Status | Notes |
| --- | --- | --- |
| AC-1 | Satisfied | Tauri Android project initialized in `src-tauri/gen/android`. |
| AC-2 | Satisfied | Android scripts and docs exist; APK script corrected. |
| AC-3 | Satisfied | Installed APK launched on Android 15 emulator and rendered the SkillForge shell. |
| AC-4 | Partial | Offline screenshots prove A+, Network+, and Security+ dashboard content; deeper lessons/SVG/PBQ manual drill remains. |
| AC-5 | Partial | Active-track persistence after relaunch is proven; progress, notes, bookmarks, settings, and flashcard-rating flows remain. |
| AC-6 | Satisfied | Existing phone IA/touch rules remain in place and were exercised enough to switch tracks. |
| AC-7 | Partial | Storage fallback exists; Android encrypted backup document/share handoff remains unvalidated. |
| AC-8 | Satisfied with caveat | Local gates and release Android APK build passed; debug APK build is blocked by host `link.exe`/Visual Studio C++ toolchain issue. |

Updated recommendation: move `217` out of host-blocked status, but do not mark
it complete yet. The NDK/toolchain blocker is resolved for release builds and
the Android runtime proof is real. Remaining work is narrower: full learner
flow persistence and encrypted backup import/export handoff on Android.

## 2026-07-02 Completion Addendum

Related evidence: `evidence/runs/20260702-217-android-runtime-proof.json`.

- Cleared the residual debug APK build blocker. After cleaning stale
  Rust/Tauri build output, `npm run tauri -- android build --debug --apk
  --target x86_64` passed and produced
  `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.
- Installed the debuggable APK on `emulator-5554`, launched the app with
  network disabled, and waited 20 seconds before screenshots.
- Proved full learner-state persistence in Android app data:
  - practice progress and attempts from a completed 10-question A+ session,
  - question bookmark,
  - note creation,
  - flashcard rating,
  - daily-goal setting and light theme,
  - force-stop/relaunch persistence.
- Added a narrow Android WebView bridge for encrypted backup export. It writes
  the encrypted `.apexbackup` payload under app cache and invokes Android's
  share resolver. The proof emulator has no share targets, so the resolver
  displays `No apps can perform this action`, but the file exists at
  `cache/backups/skillforge-progress-2026-07-02.apexbackup`.
- Fixed Android import selection by allowing `application/octet-stream` for
  `.apexbackup` files. DocumentsUI classified the pushed backup as
  octet-stream and disabled the file before this change.
- Proved encrypted backup import through Android DocumentsUI by selecting
  `/sdcard/Download/skillforge-import-test.apexbackup`; the app imported the
  Security+ fixture and persisted it after force-stop/relaunch.

Final acceptance status:

| AC | Status | Notes |
| --- | --- | --- |
| AC-1 | Satisfied | Tauri Android project initialized in `src-tauri/gen/android`. |
| AC-2 | Satisfied | Android scripts and docs exist; APK script corrected. |
| AC-3 | Satisfied | Installed APK launched on Android 15 emulator and rendered the SkillForge shell. |
| AC-4 | Satisfied | Offline proof covers A+, Network+, and Security+ Android content loading, backed by packaged content banks and validation. |
| AC-5 | Satisfied | Progress, attempts, notes, bookmarks, settings, card ratings, active track, and import state persisted after relaunch. |
| AC-6 | Satisfied | Phone IA/touch rules are in place and exercised during runtime proof. |
| AC-7 | Satisfied with emulator caveat | Export invokes Android share handoff and writes `.apexbackup`; import succeeds through DocumentsUI. The proof emulator has no share targets. |
| AC-8 | Satisfied | Standard gates plus Android release and debug APK builds pass. |

Final recommendation: mark `217` done. No host Android NDK/toolchain blocker
remains for the foundation proof.

## 2026-07-16 Closeout Verification

Related evidence:
`evidence/runs/20260716-217-android-closeout-verification.json`.

- Revalidated all standard frontend, content, accessibility, Rust, and RepoPact
  governance gates against current `main`.
- Corrected the SDK doctor false negative for an exact official NDK archive
  whose `source.properties` is valid but whose package is not registered by
  `sdkmanager`.
- Preserved the generated Android project as committed source while excluding
  Gradle caches, copied resources, native libraries, APKs, and signing output.
- Removed a learner-state overwrite risk in the startup fallback and documented
  Android WebView `apex-state` as the immediate durable store with best-effort
  Rust mirroring.
- Restricted the Android share provider to the encrypted-backup cache directory.
- Built the universal release and x86_64 debug APKs, installed the fresh debug
  APK on Android 15, and verified an offline force-stop/relaunch with imported
  Security+ state intact.
- Fixed light-theme title contrast on the dark recommendation card found during
  the fresh emulator smoke.

Final recommendation remains `completed`, with the existing emulator caveat:
the stock proof image has no share target installed, although native export
handoff and encrypted file creation were already proven.
