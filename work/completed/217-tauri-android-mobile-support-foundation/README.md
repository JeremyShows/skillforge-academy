# 217 - Add Tauri Android mobile support foundation

> **Status**: Active
> **Owners**: Desktop/Mobile Specialist lead; QA Specialist support.
> **Depends on**: none.

## Intent

Bring SkillForge Academy to Android through Tauri mobile directly. This is not a
PWA, not a separate React Native app, and not a temporary web-mobile branch. The
same React + TypeScript + Rust/Tauri product architecture remains the platform.

The first target is an installable Android build that can launch, load bundled
certification content offline, persist learner state locally, and support the
core study workflows on a phone-sized touch screen.

## Source References

- Tauri v2 prerequisites document Android Studio, JDK/JAVA_HOME, SDK/NDK, and
  mobile target setup requirements.
- Tauri v2 development docs use `tauri android dev` and
  `tauri android build` for mobile development and packaging.

## Scope

In scope:

- Initialize Android support with the Tauri v2 mobile project layout.
- Add package scripts for Android dev/build workflows.
- Adjust Vite/Tauri dev host configuration if required by Android device or
  emulator networking.
- Make bundled `src/content` loading work on Android, including lesson assets
  and PBQ data, with airplane-mode/offline proof after install.
- Verify local learner state persistence through the existing Rust/Tauri command
  surface or an Android-specific Tauri-compatible path.
- Define the Android small-screen information architecture: navigation pattern,
  touch target rules, sidebar behavior, chart simplification, virtual-keyboard
  behavior, and review/PBQ layout rules for phone and tablet breakpoints.
- Validate Android file/storage behavior for local state and encrypted backup
  import/export under sandbox rules.
- Document Android prerequisites and build/run instructions.
- Add Android-specific validation evidence and screenshots or emulator notes.

Out of scope:

- PWA/mobile web architecture.
- iOS support; tracked separately by 218.
- Play Store listing, paid signing, production distribution, or store review.
- Replacing the desktop app architecture.
- Broad redesign unrelated to mobile usability blockers.

## Implementation Plan

1. Confirm host prerequisites.
   - Android Studio installed.
   - Android SDK/NDK available.
   - Java/JDK path available (`JAVA_HOME`).
   - Rust Android targets installed as required by Tauri.
   - At least one emulator or physical device available.

2. Initialize Android.
   - Run the Tauri mobile initialization command for Android.
   - Commit generated Android project files intentionally.
   - Keep app identifier aligned with existing product identity unless a mobile
     store requirement forces a documented mobile-specific bundle id.

3. Add scripts and docs.
   - Add `mobile:android:dev` and `mobile:android:build` or similarly named
     scripts that call the Tauri Android CLI path.
   - Document emulator/device setup and known environment variables.

4. Prove app boot.
   - Launch on emulator/device.
   - Confirm splash/window shell renders.
   - Confirm no blank WebView, asset path, or CSP/resource failure.

5. Prove content loading.
   - Open each track.
   - Confirm A+, Network+, and Security+ domains, lessons, questions,
     flashcards, and PBQs are available offline.
   - Confirm lesson SVG assets render from the bundled package.
   - Run with network disabled after install if practical.

6. Prove persistence.
   - Change active track.
   - Complete at least one practice question.
   - Rate one flashcard.
   - Add a note and bookmark.
   - Close/reopen app and confirm state survives.

7. Make UI touch-usable.
   - Check small phone viewport and a tablet viewport.
   - Decide the mobile navigation model before patching: retained sidebar,
     drawer, bottom navigation, or another Tauri-friendly pattern.
   - Fix overflow, cramped navigation, safe areas, dialogs, PBQ controls, mock
     setup, analytics charts, review screens, virtual keyboard behavior, and
     notes editor as needed.
   - Preserve keyboard/accessibility affordances.

8. Handle backup/export/import.
   - Test encrypted `.apexbackup` export/import on Android.
   - Identify the local state path and backup handoff path in the Android app
     sandbox.
   - If Android file picker, share-sheet, storage integration, or permissions
     need a Tauri plugin or native change, implement it if scoped; otherwise
     record the blocker and exact next work item needed.

9. Validate.
   - `node scripts/validate-content.mjs --strict-coverage`
   - `npm test -- --run`
   - `npm run validate:a11y`
   - `npm run build`
   - `cargo fmt --check --manifest-path src-tauri/Cargo.toml`
   - `cargo check --manifest-path src-tauri/Cargo.toml`
   - Android dev launch on emulator/device
   - Android build command producing an APK/AAB or documented unsigned package

## Risks

- Android storage and file picker behavior may require Tauri plugins or
  platform-specific permissions.
- The current desktop-oriented layout may need nontrivial responsive work for
  analytics, notes, and exam review screens.
- Tauri Android builds depend on local SDK/NDK/JDK setup; if the host is missing
  prerequisites, record exact installation steps instead of guessing.
- Mobile packaging may expose assumptions in desktop resource loading.

## Closeout

Close only when Android is a real Tauri mobile target in the repo, the app has
launched on an Android emulator or device, content and learner state work
offline, core study flows are touch-usable, and the Android build path is either
green or blocked by a precisely documented external prerequisite.

## Work Log

### 2026-06-30 - Repository foundation complete; host NDK blocker

- Added Tauri Android npm scripts for init, dev, Android Studio handoff, and APK
  build.
- Updated Vite dev-server configuration to honor `TAURI_DEV_HOST` for mobile
  device access and HMR.
- Added `docs/android-mobile.md` with Android prerequisites, commands,
  small-screen information architecture, storage/backup stance, and validation
  checklist.
- Updated `docs/backup-restore.md` and `README.md` with Android status and
  mobile development entry points.
- Added phone-width CSS rules for core study flows, PBQ controls, mock review,
  flashcards, notes, settings, and dialogs.
- Created `audits/AUDIT-2026-06-30-android-mobile-foundation.md`.

Host evidence:

- `npm run tauri -- info` passed.
- `java -version` reported OpenJDK 17.0.19.
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` were both set to the configured Android SDK root.
- `sdkmanager --list_installed` reported emulator, platform-tools, and Android
  35 system image only.
- `npm run tauri -- android init --ci` failed because Android NDK was not found.
- Retried SDK installation for NDK 27.2/CMake and NDK 26.3; both failed to
  complete cleanly. Tauri now finds the partial NDK 26.3 directory but fails
  because its `source.properties` file is missing.
- `npm run validate:content`, `npm run validate:a11y`, `npm test -- --run`,
  `npm run build`, `cargo fmt --check --manifest-path src-tauri/Cargo.toml`,
  and `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- `python -m repopact_cli validate` still fails on a repo-wide preflight-marker
  requirement affecting existing active, blocked, and completed work items.

Status: blocked, not done. Android launch, offline content proof, persistence
proof, backup document/share handoff, and APK output still require a complete
Android NDK install followed by `npm run mobile:android:init`.

### 2026-07-01 - Runtime retry; SDK acquisition still blocked

- Moved the stale partial NDK directory aside
  after verifying it contained only `.installer` metadata and no
  `source.properties`.
- Retried `sdkmanager "platforms;android-35" "build-tools;35.0.0"
  "ndk;26.3.11579264" "cmake;3.22.1"`. The process produced no useful output,
  stalled, and left only partial temp downloads.
- Retried a narrower platform/build-tools install. It also stalled and left a
  partial build-tools `.installer` stub, which was moved aside.
- Downloaded the official Android repository XML and resolved exact package
  archive names and SHA-1 checksums. Direct archive download worked, but
  throughput stayed around tens of KB/sec; the platform download reached only
  about 3.9 MB of 64.3 MB after roughly 2.5 minutes, making the 665 MB NDK
  archive impractical during this run.
- Searched common Android/AppData/Program Files locations for an existing NDK
  `source.properties`; none was found.
- `npm run mobile:android:init` still fails with `Android NDK not found. Make
  sure the NDK is installed and the NDK_HOME environment variable is set.`
- `adb devices` reported no connected/running devices. `emulator -list-avds`
  reports `forge_moto_one_hyper_lab_api35`, but app launch remains blocked
  before Android project generation.

Status: blocked, not done. Required host prerequisites are now precise:
`platforms;android-35`, `build-tools;35.0.0`, and `ndk;26.3.11579264` must be
fully installed under `$env:ANDROID_HOME`, and the NDK must include
its `source.properties` file. Resume with a reliable SDK
package install or a verified local copy of the official Android SDK/NDK
archives, then run `npm run mobile:android:init`.

### 2026-07-02 - Android runtime proof achieved; residual mobile handoff gaps

- Installed the verified local Android NDK r26d archive into
- Installed the verified local Android NDK r26d archive under `$env:ANDROID_HOME`; `source.properties` reports
  `Pkg.Revision = 26.3.11579264` and `Pkg.ReleaseName = r26d`.
- `npm run mobile:android:init` succeeded and generated the Tauri Android
  project under `src-tauri/gen/android`.
- Fixed the APK build script to call `tauri android build --apk`; the previous
  `-- --apk` shape forwarded `--apk` to cargo and failed.
- `npm run mobile:android:build` succeeded and produced
  `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`.
- `npm run tauri -- android build --apk --target x86_64` succeeded for the
  emulator proof. The unsigned APK SHA-256 is
  `C86E2380DB4AE27E0B6997A10DFC1B54F1A229AA85B616A8B493341A5C927328`.
- Signed the x86_64 APK with the local Android debug key for emulator install.
  The signed proof APK is
  `evidence/android/217-app-x86_64-release-debug-signed.apk` with SHA-256
  `DC10BD9A7637E2233721AD53CD7C6FF52DD8FF92FB134E2A73BC5B84E8F74C77`.
- Installed and launched the app on `emulator-5554` using the
  `forge_moto_one_hyper_lab_api35` Android 15 x86_64 AVD.
- Disabled Wi-Fi and mobile data before runtime proof. Offline screenshots show
  the Android app clearing splash and loading A+, Network+, and Security+
  dashboard content from the bundled app:
  - `evidence/android/217-offline-launch-timeout-fallback.png`
  - `evidence/android/217-track-selector-open.png`
  - `evidence/android/217-network-plus-dashboard-offline.png`
  - `evidence/android/217-security-plus-dashboard-offline-2.png`
- Verified active-track learner state persistence by selecting Security+,
  force-stopping the app, relaunching it, and capturing Security+ still selected
  in `evidence/android/217-security-plus-persisted-after-relaunch-2.png`.
- Added a bounded mobile startup fallback so Android cannot remain permanently
  on the splash screen if the Tauri backend bridge stalls: state falls back to
  the existing `apex-state` localStorage key, content falls back to bundled JSON
  banks, and backend saves are attempted without blocking local persistence.

Validation evidence:

- `npm run validate:content` passed: 3 certifications, 19 domains, 770
  questions, 135 flashcards, 28 PBQs, and 150 lessons.
- `npm run validate:a11y` passed.
- `npm test -- --run` passed: 68 tests across 3 files.
- `npm run build` passed.
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml` passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- Android release APK build, signing, install, offline launch, track switcher,
  and active-track relaunch persistence passed.

Residual limits:

- `npm run tauri -- android build --debug --apk` still fails on this Windows
  host with `link.exe` while compiling the Rust `displaydoc` proc-macro DLL.
  Rust reports the Visual Studio C++ build tools may need repair or a missing
  C++ workload component. Release Android builds are not blocked by this.
- The proof validates active-track persistence, but not the full set of
  progress, notes, bookmarks, settings, and flashcard-rating persistence flows.
- Encrypted `.apexbackup` export/import through an Android document picker or
  share sheet remains unvalidated and likely needs a narrowly scoped mobile
  handoff implementation.

Status: active, not blocked on Android NDK/toolchain. The Android runtime proof
is real, but 217 should not be marked complete until the remaining persistence
flows and backup document/share handoff are either validated or split into a
new accepted follow-up.

### 2026-07-02 - Android runtime foundation complete

- Cleared the residual debug APK blocker by cleaning the stale Rust/Tauri build
  output and rerunning `npm run tauri -- android build --debug --apk --target
  x86_64`. The build now produces
  `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.
- Installed the debuggable APK on `emulator-5554`, cleared app data for a fresh
  proof, launched with Wi-Fi/data disabled, and waited 20 seconds before the
  first screenshot.
- Proved full Android learner-state persistence through the real app sandbox:
  completed a 10-question A+ practice session, bookmarked a question, created a
  note, rated a flashcard, changed the daily goal, switched to light theme,
  force-stopped/relaunched, waited 20 seconds, and verified the same
  `learner-state.json` fields after relaunch.
- Added a narrow Android WebView bridge for encrypted backup export. The app now
  writes the encrypted `.apexbackup` payload into app cache and hands it to
  Android's share resolver. The bare emulator opens the resolver but reports
  `No apps can perform this action`, which is a host image limitation; the file
  itself exists at `cache/backups/skillforge-progress-2026-07-02.apexbackup`.
- Fixed Android `.apexbackup` import filtering by accepting
  `application/octet-stream` as well as JSON/custom extension backups. Android
  DocumentsUI had classified the pushed `.apexbackup` as octet-stream and
  disabled selection before this fix.
- Proved encrypted `.apexbackup` import through Android DocumentsUI: pushed
  `evidence/android/217-import-test.apexbackup` to `/sdcard/Download`, selected
  it through the picker, returned to the app, and verified the imported
  Security+ learner state persisted after force-stop/relaunch.

Additional evidence:

- `evidence/android/217-debug-practice-after-finish-attempt.png`
- `evidence/android/217-debug-state-after-practice-finish-attempt.json`
- `evidence/android/217-debug-state-after-notes-flashcards-settings.json`
- `evidence/android/217-debug-state-after-relaunch.json`
- `evidence/android/217-debug-export-share-sheet.png`
- `evidence/android/217-debug-import-picker-downloads-after-filter.png`
- `evidence/android/217-debug-state-after-import-success.json`
- `evidence/android/217-debug-state-after-final-import-relaunch.json`

Status: completed. Android Tauri initialization, release/debug APK builds, emulator
launch, offline content proof, full learner-state persistence, and encrypted
backup export/import handoff have concrete local evidence. The only caveat is
that this bare emulator image has no share targets for the export resolver,
although the Android handoff is invoked and the backup file is written.

### 2026-07-16 - Closeout verification

- Synced the current upstream `main`, including the RepoPact 2.1 governance
  upgrade and Android SDK doctor.
- Committed the generated Android project source intentionally while retaining
  nested ignores for Gradle caches, copied resources, native libraries, APKs,
  keys, and other reproducible or sensitive output.
- Fixed the Android SDK doctor to accept the verified official r26d archive by
  exact `source.properties` revision when `sdkmanager` has no registry entry.
- Removed a startup fallback path that could replace a loaded learner state with
  `initialState` when content initialization lagged, and scoped WebView
  `apex-state` fallback behavior to Android.
- Restricted Android `FileProvider` exposure to `cache/backups/` instead of the
  full cache/external roots.
- Rebuilt the universal release and x86_64 debug APKs, installed the fresh debug
  APK on `emulator-5554`, disabled Wi-Fi and mobile data, and verified imported
  Security+ state after force-stop/relaunch.
- Fixed light-theme recommendation-title contrast found in the final emulator
  smoke.

Closeout evidence: `20260716-217-android-closeout-verification`.
