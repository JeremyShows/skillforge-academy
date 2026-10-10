# Support And Troubleshooting

Practical recovery paths for SkillForge Academy. Start here when install, launch,
backups, or progress look wrong. The app stays offline and private: there is no
account portal and no automatic log upload.

Related docs:

- [Getting started](getting-started.md)
- [Backup, restore, and cross-device transfer](backup-restore.md)
- [Diagnostics and error reporting](diagnostics.md)
- [Privacy and security](privacy-security.md)
- [Windows code signing](CODE-SIGNING.md)
- [Android mobile support](android-mobile.md)
- [iOS mobile support](ios-mobile.md)

## Quick triage

| Symptom | First move |
| --- | --- |
| SmartScreen blocks the installer | [Install and SmartScreen](#install-and-smartscreen) |
| App will not open after install | [App launch](#app-launch) |
| Tracks or lessons look empty | [Content loading](#content-loading) |
| Backup will not import/export | [Backup restore](#backup-restore) |
| Progress looks wrong or stuck | [Corrupted or unexpected state](#corrupted-or-unexpected-state) |
| Need to wipe this device cleanly | [Reset and recovery](#reset-and-recovery) |
| Support asked for a diagnostic file | [Collect diagnostics](#collect-diagnostics) |
| Android/iOS specific issue | [Mobile support](#mobile-support) |

Before any reset or risky restore: export an encrypted backup from
**Preferences**, and optionally export diagnostics while the problem is still
reproducible.

## Install and SmartScreen

### Supported desktop install

- Windows 10 or 11, x64
- Microsoft Edge WebView2 Runtime (included with current Windows releases)
- About 100 MB free disk space

Download the installer only from a published [GitHub release](https://github.com/ForgeWireLabs/skillforge-academy/releases). As of 2026-10-09, v1.3.2 is the latest published release. The repository's 1.4.1-beta.1 candidate is unpublished and is not a public download. For a release that includes `SHA256SUMS.txt`, compare the listed filename and hash with the local file:

```powershell
Get-Content .\SHA256SUMS.txt
Get-ChildItem -File *.exe | Get-FileHash -Algorithm SHA256
```

### SmartScreen / unrecognized publisher

Release builds are currently **unsigned** until a trusted Windows code-signing
certificate is available (work item `212`). Windows may show:

> Windows protected your PC / Unrecognized app

Expected recovery:

1. Click **More info**.
2. Click **Run anyway**.
3. Continue the NSIS installer prompts.

This warning is expected for unsigned public builds. It is not proof that the
download is corrupted. Prefer checksum verification when you want extra
assurance. Signing details for maintainers: [CODE-SIGNING.md](CODE-SIGNING.md).

### Upgrade from Apex A+ Academy

The existing Tauri application identity and app-data directory are retained for
legacy certification progress. That data remains in the legacy workspace; it is
not automatically migrated into CourseProgress in the generic course runtime.
Make a backup before any upgrade and do not delete app data to resolve an
installer problem. If both names appear briefly in Apps & Features during an
interrupted install, finish or re-run the published SkillForge installer.

## App launch

If the installer finished but the app will not start:

1. Confirm WebView2 is present (Windows Settings → Apps, or reinstall the
   [Evergreen WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)).
2. Launch **SkillForge Academy** from the Start menu, not a leftover Apex
   shortcut.
3. If the window opens to a blank splash for a long time, wait once for content
   load, then close and reopen.
4. Export diagnostics if you can reach Preferences after a partial load.
5. As a last resort before reset: copy
   `%APPDATA%\com.apexlearning.aplusacademy\learner-state.json` somewhere safe,
   then reinstall the same version over the top (data directory is preserved).

## Content loading

SkillForge bundles certification content with the app. Offline use is expected.

| Observation | Likely cause | What to do |
| --- | --- | --- |
| Splash hangs forever | Content or state load timed out | Force-quit, relaunch; if it keeps failing, export diagnostics and keep `learner-state.json` |
| One track works, another is empty | Track content missing or coming-soon | Switch tracks; available tracks should still work |
| Practice/PBQ/Mock shows empty state | No bank for that exam filter | Change exam filter or track; reinstall if every track is empty on a known-good release |
| Lessons open without images | Asset path or incomplete install | Reinstall the same version; do not delete app data first |

Content problems are not fixed by resetting progress. Prefer reinstall while
keeping the app data folder.

## Backup restore

Full matrix and failure messages: [backup-restore.md](backup-restore.md).

### Preserve / move progress

1. **Preferences → Encrypted backup**
2. Enter a passphrase (8+ characters).
3. **Export encrypted** → save the `.apexbackup` somewhere outside the app data
   folder.
4. On the destination device: enter the same passphrase → **Import backup**.

### Common backup failures

| Message | Meaning | Safe next step |
| --- | --- | --- |
| `Enter the backup passphrase.` | Encrypted file needs the passphrase | Re-enter and import again |
| `The passphrase is incorrect or the backup is damaged.` | Wrong passphrase or truncated file | Keep current app data; locate the original backup |
| `Unsupported or invalid encrypted backup format.` | Newer/unknown envelope | Keep the file; check app version |
| `Backup file is not valid JSON.` | Legacy/plain import is malformed | Re-export from the source device |

Failed imports never replace current progress. Do not uninstall or reset until
you have confirmed the backup file and passphrase.

## Where learner data lives

| Platform | Primary learner state | Also used | How to move | How to reset |
| --- | --- | --- | --- | --- |
| Windows desktop | `%APPDATA%\com.apexlearning.aplusacademy\learner-state.json` via Tauri | Optional `localStorage` key `apex-state` in some frontend-only flows | Export/import `.apexbackup` | Preferences → **Reset progress**, or delete `learner-state.json` after a backup |
| Android | App-private WebView `apex-state`, with best-effort Rust `learner-state.json` mirror in the app sandbox | Encrypted backups via share sheet / DocumentsUI | Export/import `.apexbackup` | In-app **Reset progress**, or clear app storage in Android settings after a backup |
| iOS | Designed as app-container `learner-state.json` via Tauri (`app_data_dir`) | Document/share handoff for `.apexbackup` once runtime is validated | Export/import `.apexbackup` (not yet runtime-validated) | In-app reset once shipping; otherwise treat as blocked on macOS/Xcode host work (`218`) |

Compatibility anchors that must not be “cleaned up” casually:

- Application id: `com.apexlearning.aplusacademy`
- Browser key: `apex-state`
- Backup extension: `.apexbackup`

These intentionally survived the Apex → SkillForge rename so upgrades keep
progress.

## Corrupted or unexpected state

Symptoms: missing attempts after a crash, odd track selection, blank notes list,
or a restore that “did nothing.”

1. Confirm you are on the intended certification track.
2. Export diagnostics (captures counts and recent errors without note text by
   default).
3. Export a fresh encrypted backup if Preferences still works.
4. Try importing a known-good older backup.
5. If the app still boots but data looks impossible to trust, use
   **Reset progress** only after you have a backup you can re-import.

Malformed saves are migrated into safe defaults on load (`migrateState`). A
corrupt field should not crash the app; it may clear that field to a default.
That is why backups matter before experiments.

## Reset and recovery

### Soft reset (recommended)

1. Export encrypted backup.
2. Optionally export diagnostics.
3. **Preferences → Reset progress** and confirm.
4. Import the backup if you only needed to clear a bad session and still have a
   good file.

### Manual Windows data reset

1. Quit SkillForge Academy.
2. Copy
   `%APPDATA%\com.apexlearning.aplusacademy\learner-state.json`
   to a safe folder.
3. Delete `learner-state.json` (leave the directory unless you intend a full
   wipe).
4. Relaunch. The app starts fresh and can import a `.apexbackup`.

### After a failed upgrade or reinstall

Learner data is not stored inside the installer directory. Reinstalling the app
normally preserves `%APPDATA%\com.apexlearning.aplusacademy\`. Only delete that
folder when you deliberately want a factory-fresh learner profile.

## Collect diagnostics

Product stance (decision 0009): no telemetry, no automatic crash reporting,
local export only.

1. Open **Preferences → Diagnostics**.
2. Leave **Include display name and note text** unchecked unless support asks.
3. **Export diagnostics** → save `skillforge-diagnostic-YYYY-MM-DD.json`.
4. Share that file through your private support channel.

Details and redaction rules: [diagnostics.md](diagnostics.md).

## Mobile support

### Android

Android foundation is implemented and emulator-validated (work item `217`).

User-facing notes:

- Progress is offline and private to the app sandbox.
- Use **Preferences** encrypted backup export/import to move data; export uses
  Android’s share sheet, import uses the system document picker.
- Stock emulators may show “No apps can perform this action” on export when no
  share targets exist; on a real device choose Files, Drive, email, etc.
- If import cannot select a `.apexbackup`, ensure the file is in Downloads and
  that the picker is not filtering it away; the app accepts
  `application/octet-stream` as well as JSON-typed backups.
- Clearing app storage in Android Settings wipes local progress — export a
  backup first.

Developer host setup: [android-mobile.md](android-mobile.md).

### iOS

iOS repository scripts and docs exist, but runtime validation is **blocked**
until a macOS host with Xcode runs Tauri iOS init/dev/build (work item `218`).

Until that lands:

- Do not treat iOS install, persistence, or backup handoff as supported for end
  users.
- The published support path is Windows desktop. Android is a development foundation, not a public release commitment; iOS runtime recovery remains blocked on host validation.
- When iOS runtime is proven, this section should gain the same backup/reset
  checklist used on Android.

Developer host setup: [ios-mobile.md](ios-mobile.md).

## Still stuck?

Send support:

1. App version from Preferences (about card) or the diagnostic file.
2. Content revision from the diagnostic file (`content.revision`) — fingerprints
   the full authored banks, not only item ids.
3. Platform (Windows version, or Android device/emulator).
4. Exact on-screen error text.
5. Whether Command Center still opens after the failure.
6. The diagnostic JSON (redacted unless they asked for note text).
7. Confirmation that you still have a separate `.apexbackup` if progress matters.

Do not paste real exam credentials, unrelated personal files, or passphrase
secrets into public issues.
