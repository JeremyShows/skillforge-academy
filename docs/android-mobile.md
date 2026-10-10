# Android Mobile Support

SkillForge Academy uses the same React, TypeScript, Rust, and Tauri 2 codebase
for desktop and Android. Android support must be initialized and run through the
Tauri mobile CLI path, not through a PWA, React Native fork, or separate web
mobile application.

## Current Status

The repository now commits the generated Tauri Android project source and has a
complete emulator runtime proof for the Android foundation. Nested ignore rules
exclude Gradle caches, copied bundle resources, native libraries, APKs, and
other reproducible build output.

The verified Android NDK is r26d; its `source.properties` reports
`Pkg.Revision = 26.3.11579264` and `Pkg.ReleaseName = r26d`.
`npm run mobile:android:init` succeeded and generated `src-tauri/gen/android`.

Android release and debug builds now work locally:

- Universal unsigned APK:
  `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`
- Emulator proof APK (local proof artifact; APKs are intentionally ignored):
  `evidence/android/217-app-x86_64-release-debug-signed.apk`
- Signed proof APK SHA-256:
  `DC10BD9A7637E2233721AD53CD7C6FF52DD8FF92FB134E2A73BC5B84E8F74C77`
- Debug APK:
  `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`

The proof APK was installed on an Android 15 x86_64 AVD. With Wi-Fi and mobile
data disabled, the app launched, cleared splash, loaded A+, Network+, and
Security+ dashboard content, and persisted Security+ as the active track after
force-stop/relaunch. Evidence is recorded in
`evidence/runs/20260702-217-android-runtime-proof.json`.

The 2026-07-16 closeout verification rebuilt the universal release and x86_64
debug APKs from the committed project source, installed the fresh debug APK,
and relaunched it offline with imported Security+ learner state intact. See
`evidence/runs/20260716-217-android-closeout-verification.json`.

The follow-up runtime proof also validates progress, notes, bookmarks,
settings, flashcard scheduling, encrypted backup export handoff, and encrypted
backup import through Android DocumentsUI. Export opens Android's share
resolver and writes the `.apexbackup` file into app cache. The stock emulator
image used for proof has no share targets, so the resolver reports `No apps can
perform this action`; a physical device or emulator image with Files/Drive/mail
targets should show destinations.

## Host Prerequisites

- Java 17 or newer on `PATH`.
- Android SDK command-line tools, platform-tools, build-tools, platform, NDK,
  and an emulator or connected Android device.
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` pointing at the SDK root.
- SDK tool paths available in the shell:

```powershell
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\emulator;$env:PATH"
```

Expected SDK packages:

```powershell
sdkmanager "platforms;android-35" "build-tools;35.0.0" "ndk;26.3.11579264" "cmake;3.22.1"
sdkmanager --list_installed
```

The Android SDK is usable for release builds when
`Test-Path (Join-Path $env:ANDROID_HOME "ndk\26.3.11579264\source.properties")`
succeeds and the Tauri CLI reports that it selected the installed NDK.

## Commands

Check the Windows Android toolchain before initializing or building:

```powershell
npm run mobile:android:doctor
```

Initialize Android project files:

```powershell
npm run mobile:android:init
```

Run on a connected device or selected emulator:

```powershell
npm run mobile:android:dev
```

Open the generated Android project in Android Studio:

```powershell
npm run mobile:android:studio
```

Build a test APK:

```powershell
npm run mobile:android:build
```

Build an emulator-targeted x86_64 APK:

```powershell
npm run tauri -- android build --apk --target x86_64
```

## Android Product Rules

- Keep the existing app identifier, `com.apexlearning.aplusacademy`, unless a
  store requirement forces a documented mobile-specific change. Preserving it
  protects upgrade and local-state expectations from the desktop rename.
- Keep bundled certification content offline-first. Android builds must load
  `certifications.json`, per-track JSON banks, PBQs, lessons, and SVG lesson
  assets without requiring a network after install.
- Keep `apex-state` browser fallback compatibility. On Android it is the
  immediate durable store after the first successful local save, with the Rust
  state command still attempted as a best-effort mirror. Desktop Tauri builds
  continue to use the Rust state commands as their primary store.
- Keep `.apexbackup` export/import format compatibility with Windows and legacy
  JSON imports.

## Small-Screen Information Architecture

Android phones use the existing single-shell app with a drawer-style sidebar:

- The hamburger button opens the sidebar; all primary views stay in the same
  route-free shell.
- Track switching remains at the top of the drawer so A+, Network+, and
  Security+ progress remain visibly separate.
- The dashboard, learning paths, practice, PBQ Lab, mock setup, flashcards,
  analytics, notes, and preferences collapse to one-column layouts below the
  phone breakpoint.
- Domain navigation is hidden on narrow screens; the visible lesson/objective
  list becomes the primary study path inside the selected domain.
- Practice and mock review cards stack their controls and explanations so answer
  text, PBQ select controls, fill-in fields, and ordering controls have full
  width touch targets.
- Notes use a stacked list/editor layout so the virtual keyboard does not fight
  a fixed split-pane height.
- Dialogs and palettes use viewport-constrained widths and scrollable bodies.

## Android Storage And Backup Stance

Android learner state is stored in the app-private WebView `apex-state` store so
the UI remains usable if the Tauri command bridge stalls. Saves also attempt the
Rust `save_state` command as a best-effort mirror. Both stores remain inside the
Android application sandbox; neither requires broad storage permission.

Encrypted backup export/import needs a platform handoff path rather than a raw
desktop-style file path. The preferred implementation is:

- Export: create the same `.apexbackup` envelope in the web layer, then hand it
  to an Android document/share flow.
- Import: receive a document-picker result, read the selected bytes, decrypt or
  parse through the existing `decryptBackup` and `migrateState` path, then
  persist through `save_state`.
- Permissions: request only document/share capabilities required for explicit
  user-selected files. Do not request broad storage access for normal learner
  state.

Android may classify `.apexbackup` files as `application/octet-stream`, so the
file input accepts that MIME type in addition to JSON and the custom extension.

## Validation Checklist

After Android initialization succeeds:

- `node scripts/validate-content.mjs --strict-coverage`
- `npm test -- --run`
- `npm run validate:a11y`
- `npm run build`
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run mobile:android:dev`
- `npm run mobile:android:build`

Manual Android smoke:

- Launch the app on an emulator or physical device.
- Confirm the SkillForge shell renders without a blank WebView.
- Switch between A+, Network+, and Security+.
- Open domains, lessons with SVG assets, practice questions, PBQs, mock setup,
  flashcards, analytics, notes, and preferences.
- Disable network after install and confirm bundled content still loads.
- Change active track, answer a question, rate a flashcard, add a note, bookmark
  a question, close the app, reopen it, and confirm state survives.
- Export and import an encrypted `.apexbackup` once Android document/share
  handoff exists.
