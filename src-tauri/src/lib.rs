use chrono::Utc;
use serde_json::{json, Value};
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};
use tauri::{AppHandle, Manager};

/// Soft ceiling for persisted learner-state / imported backup JSON (5 MiB).
const MAX_STATE_CHARS: usize = 5 * 1024 * 1024;

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("learner-state.json"))
}

fn platform_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("platform-state.json"))
}

fn read_platform_state_map(path: &Path) -> Result<serde_json::Map<String, Value>, String> {
    if !path.exists() {
        return Ok(serde_json::Map::new());
    }
    let raw =
        fs::read_to_string(path).map_err(|e| format!("Could not read platform state: {e}"))?;
    assert_state_size(&raw, "Saved platform state")?;
    match serde_json::from_str::<Value>(&raw)
        .map_err(|e| format!("Saved platform state is invalid: {e}"))?
    {
        Value::Object(map) => Ok(map),
        _ => Err("Saved platform state must be a JSON object.".to_string()),
    }
}

fn valid_platform_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 256
        && key
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:@-".contains(&byte))
}

static PLATFORM_STATE_WRITE_LOCK: Mutex<()> = Mutex::new(());
static LEARNER_STATE_WRITE_LOCK: Mutex<()> = Mutex::new(());
static PLATFORM_STATE_TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn write_temporary_file(path: &Path, bytes: &[u8]) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Learner state path has no parent directory.".to_string())?;
    let filename = path
        .file_name()
        .ok_or_else(|| "Platform state path has no file name.".to_string())?
        .to_string_lossy();

    for _ in 0..16 {
        let sequence = PLATFORM_STATE_TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let temp = parent.join(format!("{filename}.tmp-{}-{sequence}", std::process::id()));
        let mut file = match OpenOptions::new().write(true).create_new(true).open(&temp) {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "Could not create platform-state temporary file: {error}"
                ))
            }
        };

        let write_result = file.write_all(bytes).and_then(|()| file.sync_all());
        drop(file);
        if let Err(error) = write_result {
            let _ = fs::remove_file(&temp);
            return Err(format!(
                "Could not complete learner-state temporary write: {error}"
            ));
        }
        return Ok(temp);
    }

    Err("Could not allocate a unique learner-state temporary file.".to_string())
}

fn write_platform_state_file(path: &Path, raw: &str) -> Result<(), String> {
    let temp = write_temporary_file(path, raw.as_bytes())?;
    if let Err(error) = replace_platform_state_file(&temp, path) {
        let _ = fs::remove_file(&temp);
        return Err(format!("Could not replace saved platform state: {error}"));
    }
    Ok(())
}

fn read_optional_file(path: &Path) -> Result<Option<Vec<u8>>, String> {
    match fs::read(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Could not read existing learner state: {error}")),
    }
}

fn replace_two_files_with(
    first_path: &Path,
    first_contents: &[u8],
    second_path: &Path,
    second_contents: &[u8],
    replace: impl Fn(&Path, &Path) -> io::Result<()>,
) -> Result<(), String> {
    let first_original = read_optional_file(first_path)?;
    let second_original = read_optional_file(second_path)?;
    let first_temp = write_temporary_file(first_path, first_contents)?;
    let second_temp = match write_temporary_file(second_path, second_contents) {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::remove_file(&first_temp);
            return Err(error);
        }
    };
    let first_backup = match first_original.as_deref() {
        Some(contents) => match write_temporary_file(first_path, contents) {
            Ok(path) => Some(path),
            Err(error) => {
                let _ = fs::remove_file(&first_temp);
                let _ = fs::remove_file(&second_temp);
                return Err(error);
            }
        },
        None => None,
    };
    let second_backup = match second_original.as_deref() {
        Some(contents) => match write_temporary_file(second_path, contents) {
            Ok(path) => Some(path),
            Err(error) => {
                let _ = fs::remove_file(&first_temp);
                let _ = fs::remove_file(&second_temp);
                if let Some(backup) = &first_backup {
                    let _ = fs::remove_file(backup);
                }
                return Err(error);
            }
        },
        None => None,
    };

    if let Err(error) = replace(&first_temp, first_path) {
        let _ = fs::remove_file(&first_temp);
        let _ = fs::remove_file(&second_temp);
        if let Some(backup) = &first_backup {
            let _ = fs::remove_file(backup);
        }
        if let Some(backup) = &second_backup {
            let _ = fs::remove_file(backup);
        }
        return Err(format!("Could not replace legacy learner state: {error}"));
    }

    if let Err(error) = replace(&second_temp, second_path) {
        let rollback = match &first_backup {
            Some(backup) => replace(backup, first_path),
            None => fs::remove_file(first_path),
        };
        let _ = fs::remove_file(&first_temp);
        let _ = fs::remove_file(&second_temp);
        if rollback.is_ok() {
            if let Some(backup) = &first_backup {
                let _ = fs::remove_file(backup);
            }
            if let Some(backup) = &second_backup {
                let _ = fs::remove_file(backup);
            }
            return Err(format!(
                "Could not replace platform learner state; legacy state was rolled back: {error}"
            ));
        }
        // Keep the staged original beside the state files so recovery remains possible.
        return Err(format!("Could not replace platform learner state ({error}) and legacy-state rollback failed; original bytes remain in the protected temporary recovery file."));
    }

    if let Some(backup) = &first_backup {
        let _ = fs::remove_file(backup);
    }
    if let Some(backup) = &second_backup {
        let _ = fs::remove_file(backup);
    }
    Ok(())
}

fn replace_two_files_transactionally(
    first_path: &Path,
    first_contents: &[u8],
    second_path: &Path,
    second_contents: &[u8],
) -> Result<(), String> {
    replace_two_files_with(
        first_path,
        first_contents,
        second_path,
        second_contents,
        replace_platform_state_file,
    )
}

#[cfg(windows)]
fn replace_platform_state_file(temp: &Path, target: &Path) -> io::Result<()> {
    let source: Vec<u16> = temp
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let destination: Vec<u16> = target
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    #[link(name = "Kernel32")]
    extern "system" {
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;
    let replaced = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if replaced == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_platform_state_file(temp: &Path, target: &Path) -> io::Result<()> {
    fs::rename(temp, target)
}

fn mutate_platform_state_file(
    path: &Path,
    update: impl FnOnce(&mut serde_json::Map<String, Value>) -> Result<(), String>,
) -> Result<(), String> {
    let _guard = PLATFORM_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Platform state writer lock is unavailable.".to_string())?;
    let mut map = read_platform_state_map(path)?;
    update(&mut map)?;
    let raw = serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Platform state")?;
    write_platform_state_file(path, &raw)
}

#[tauri::command]
fn load_course_state(app: AppHandle, key: String) -> Result<Value, String> {
    if !valid_platform_key(&key) {
        return Err("Invalid platform state key.".to_string());
    }
    let path = platform_state_path(&app)?;
    let map = read_platform_state_map(&path)?;
    Ok(map
        .get(&key)
        .cloned()
        .unwrap_or_else(|| json!({ "payload": null, "recovered": false })))
}

#[tauri::command]
fn save_course_state(app: AppHandle, key: String, envelope: Value) -> Result<Value, String> {
    if !valid_platform_key(&key) {
        return Err("Invalid platform state key.".to_string());
    }
    let path = platform_state_path(&app)?;
    mutate_platform_state_file(&path, |map| {
        map.insert(key, envelope);
        Ok(())
    })?;
    Ok(json!({ "savedAt": Utc::now().to_rfc3339() }))
}

#[tauri::command]
fn reset_course_state(app: AppHandle, key: String) -> Result<(), String> {
    if !valid_platform_key(&key) {
        return Err("Invalid platform state key.".to_string());
    }
    let path = platform_state_path(&app)?;
    mutate_platform_state_file(&path, |map| {
        map.remove(&key);
        Ok(())
    })
}

fn valid_progress_value(value: &Value) -> bool {
    let Some(progress) = value.as_object() else {
        return false;
    };
    let Some(current) = progress.get("current").and_then(Value::as_object) else {
        return false;
    };
    ["courseId", "courseVersion", "contentVersion", "updatedAt"]
        .iter()
        .all(|key| {
            progress
                .get(*key)
                .and_then(Value::as_str)
                .is_some_and(|value| !value.trim().is_empty())
        })
        && ["moduleId", "lessonId", "activityId"].iter().all(|key| {
            current
                .get(*key)
                .and_then(Value::as_str)
                .is_some_and(|value| !value.trim().is_empty())
        })
        && ["lessonProgress", "moduleProgress"].iter().all(|key| {
            progress
                .get(*key)
                .and_then(Value::as_object)
                .is_some_and(|map| map.values().all(Value::is_object))
        })
        && [
            "reviewQueue",
            "sessions",
            "weaknessTags",
            "assistedActivityIds",
        ]
        .iter()
        .all(|key| progress.get(*key).and_then(Value::as_array).is_some())
        && progress.get("packageId").is_none_or(Value::is_string)
        && progress.get("assessmentAttempts").is_none_or(|value| {
            value
                .as_u64()
                .is_some_and(|count| count <= 9_007_199_254_740_991)
        })
        && progress.get("notes").is_none_or(|value| {
            value
                .as_array()
                .is_some_and(|items| items.iter().all(Value::is_string))
        })
        && ["activeSessionId", "sessionStartedAt", "completedAt"]
            .iter()
            .all(|key| progress.get(*key).is_none_or(Value::is_string))
        && progress.get("capstone").is_none_or(Value::is_object)
}

fn valid_legacy_learner_state(value: &Value) -> bool {
    let Some(state) = value.as_object() else {
        return false;
    };
    if state.is_empty() {
        return true;
    }
    let recognized = [
        "schemaVersion",
        "name",
        "activeCertId",
        "progress",
        "answered",
        "attempts",
        "bookmarks",
        "lessonsRead",
        "notes",
        "cardRatings",
        "theme",
    ];
    if recognized
        .iter()
        .filter(|key| state.contains_key(**key))
        .count()
        < 2
    {
        return false;
    }
    state
        .get("schemaVersion")
        .is_none_or(|value| value.as_u64().is_some_and(|version| version <= 3))
        && state.get("name").is_none_or(Value::is_string)
        && state.get("activeCertId").is_none_or(Value::is_string)
        && state
            .get("theme")
            .is_none_or(|value| matches!(value.as_str(), Some("dark" | "light")))
        && ["progress", "answered", "cardRatings"].iter().all(|key| {
            state.get(*key).is_none_or(|value| {
                value
                    .as_object()
                    .is_some_and(|map| map.values().all(Value::is_object))
            })
        })
        && state.get("attempts").is_none_or(|value| {
            value
                .as_array()
                .is_some_and(|items| items.iter().all(Value::is_object))
        })
        && ["bookmarks", "lessonsRead"].iter().all(|key| {
            state.get(*key).is_none_or(|value| {
                value
                    .as_array()
                    .is_some_and(|items| items.iter().all(Value::is_string))
            })
        })
        && state.get("notes").is_none_or(|value| {
            value.as_array().is_some_and(|notes| {
                notes.iter().all(|note| {
                    note.as_object().is_some_and(|note| {
                        ["id", "title", "body", "updatedAt"]
                            .iter()
                            .all(|key| note.get(*key).is_some_and(Value::is_string))
                    })
                })
            })
        })
}

fn valid_platform_backup_wrapper(value: &Value) -> bool {
    let Some(wrapper) = value.as_object() else {
        return false;
    };
    let Some(payload) = wrapper.get("payload").and_then(Value::as_object) else {
        return false;
    };
    if wrapper.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || wrapper.get("courseId").and_then(Value::as_str) != Some("skillforge-platform")
        || wrapper.get("courseVersion").and_then(Value::as_str) != Some("1.0.0")
        || wrapper.get("contentVersion").and_then(Value::as_str) != Some("1")
        || wrapper.get("savedAt").and_then(Value::as_str).is_none()
        || payload.get("format").and_then(Value::as_str) != Some("skillforge-platform-learner")
        || payload.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || !payload.get("savedAt").and_then(Value::as_str).is_some()
        || !payload
            .get("legacyState")
            .is_some_and(valid_legacy_learner_state)
    {
        return false;
    }
    let Some(packages) = payload.get("installedPackages").and_then(Value::as_array) else {
        return false;
    };
    let mut package_ids = std::collections::HashSet::new();
    if !packages.iter().all(|identity| {
        let Some(identity) = identity.as_object() else {
            return false;
        };
        ["packageId", "courseId", "courseVersion", "contentVersion"]
            .iter()
            .all(|key| {
                identity
                    .get(*key)
                    .and_then(Value::as_str)
                    .is_some_and(|value| !value.trim().is_empty())
            })
            && identity.get("packageVersion").is_none_or(Value::is_string)
            && package_ids.insert(
                identity
                    .get("packageId")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
            )
    }) {
        return false;
    }
    let Some(courses) = payload.get("courses").and_then(Value::as_object) else {
        return false;
    };
    if !courses.iter().all(|(namespace, course)| {
        if namespace.trim().is_empty() {
            return false;
        }
        let Some(course) = course.as_object() else {
            return false;
        };
        course.get("progress").is_none_or(valid_progress_value)
            && ["classroom", "lecture", "labs"]
                .iter()
                .all(|slot| course.get(*slot).is_none_or(Value::is_object))
    }) {
        return false;
    }
    payload
        .get("quarantinedCourseProgress")
        .is_none_or(|value| {
            let Some(entries) = value.as_object() else {
                return false;
            };
            entries.iter().all(|(namespace, records)| {
                !namespace.trim().is_empty()
                    && records.as_array().is_some_and(|records| {
                        records.iter().all(|record| {
                            record.as_object().is_some_and(|record| {
                                record.contains_key("rawProgress")
                                    && record
                                        .get("reason")
                                        .and_then(Value::as_str)
                                        .is_some_and(|value| !value.trim().is_empty())
                                    && record
                                        .get("quarantinedAt")
                                        .and_then(Value::as_str)
                                        .is_some_and(|value| !value.trim().is_empty())
                            })
                        })
                    })
            })
        })
}

#[tauri::command]
fn import_learner_backup(
    app: AppHandle,
    legacy_state: Value,
    platform_key: String,
    platform_envelope: Value,
) -> Result<Value, String> {
    if !legacy_state.is_object() {
        return Err("Legacy learner backup state must be a JSON object.".to_string());
    }
    if platform_key != "skillforge-platform-learner-v1"
        || !valid_platform_backup_wrapper(&platform_envelope)
    {
        return Err("Platform learner backup is invalid.".to_string());
    }
    let legacy_raw = serde_json::to_string_pretty(&legacy_state).map_err(|e| e.to_string())?;
    assert_state_size(&legacy_raw, "Imported learner state")?;

    let legacy_path = state_path(&app)?;
    let platform_path = platform_state_path(&app)?;
    let _legacy_guard = LEARNER_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Learner-state writer lock is unavailable.".to_string())?;
    let _platform_guard = PLATFORM_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Platform-state writer lock is unavailable.".to_string())?;

    let mut platform_map = read_platform_state_map(&platform_path)?;
    platform_map.insert(platform_key, platform_envelope);
    let platform_raw =
        serde_json::to_string_pretty(&Value::Object(platform_map)).map_err(|e| e.to_string())?;
    assert_state_size(&platform_raw, "Platform state")?;
    replace_two_files_transactionally(
        &legacy_path,
        legacy_raw.as_bytes(),
        &platform_path,
        platform_raw.as_bytes(),
    )?;
    Ok(json!({ "savedAt": Utc::now().to_rfc3339() }))
}

fn assert_state_size(raw: &str, label: &str) -> Result<(), String> {
    if raw.len() > MAX_STATE_CHARS {
        return Err(format!("{label} is too large to handle safely."));
    }
    Ok(())
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Value, String> {
    let path = state_path(&app)?;
    if !path.exists() {
        return Ok(json!({}));
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Saved learner state")?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<Value, String> {
    let _guard = LEARNER_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Learner-state writer lock is unavailable.".to_string())?;
    let path = state_path(&app)?;
    let temp = path.with_extension("tmp");
    let raw = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Learner state")?;
    fs::write(&temp, raw).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())?;
    Ok(json!({ "savedAt": Utc::now().to_rfc3339() }))
}

#[tauri::command]
fn import_state(app: AppHandle, raw: String) -> Result<Value, String> {
    assert_state_size(&raw, "Imported backup")?;
    // Validate that the incoming text is well-formed JSON before persisting it.
    let parsed: Value =
        serde_json::from_str(&raw).map_err(|e| format!("Invalid backup file: {e}"))?;
    let _guard = LEARNER_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Learner-state writer lock is unavailable.".to_string())?;
    let path = state_path(&app)?;
    let temp = path.with_extension("tmp");
    let pretty = serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())?;
    assert_state_size(&pretty, "Imported backup")?;
    fs::write(&temp, pretty).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())?;
    Ok(parsed)
}

#[tauri::command]
fn reset_state(app: AppHandle) -> Result<(), String> {
    let _guard = LEARNER_STATE_WRITE_LOCK
        .lock()
        .map_err(|_| "Learner-state writer lock is unavailable.".to_string())?;
    let path = state_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Assembles a content bundle from a resource `content/` directory.
/// Extracted from the Tauri command so unit tests can exercise the same path
/// without an AppHandle (desktop GTK deps are not required for this check).
fn assemble_content_from_dir(dir: &std::path::Path) -> Result<Value, String> {
    let read = |path: PathBuf, label: &str| -> Result<Value, String> {
        let raw = fs::read_to_string(&path).map_err(|e| format!("{label}: {e}"))?;
        serde_json::from_str(&raw).map_err(|e| format!("{label}: {e}"))
    };

    let certifications = read(dir.join("certifications.json"), "certifications.json")?;
    let cert_ids: Vec<String> = certifications
        .as_array()
        .map(|certs| {
            certs
                .iter()
                .filter_map(|c| c.get("id").and_then(Value::as_str).map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let (mut domains, mut questions, mut flashcards, mut pbqs, mut lessons, mut objectives) = (
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
        Vec::new(),
    );
    let extend = |target: &mut Vec<Value>, value: Value| {
        if let Value::Array(items) = value {
            target.extend(items);
        }
    };
    for id in &cert_ids {
        let cdir = dir.join(id);
        extend(
            &mut domains,
            read(cdir.join("domains.json"), &format!("{id}/domains.json"))?,
        );
        extend(
            &mut questions,
            read(cdir.join("questions.json"), &format!("{id}/questions.json"))?,
        );
        extend(
            &mut flashcards,
            read(
                cdir.join("flashcards.json"),
                &format!("{id}/flashcards.json"),
            )?,
        );
        // PBQs, lessons, and objectives are optional so a track without them
        // still loads; the frontend requires `objectives` to be an array key.
        if let Ok(value) = read(cdir.join("pbqs.json"), &format!("{id}/pbqs.json")) {
            extend(&mut pbqs, value);
        }
        if let Ok(value) = read(cdir.join("lessons.json"), &format!("{id}/lessons.json")) {
            extend(&mut lessons, value);
        }
        if let Ok(value) = read(
            cdir.join("objectives.json"),
            &format!("{id}/objectives.json"),
        ) {
            extend(&mut objectives, value);
        }
    }

    Ok(json!({
        "certifications": certifications,
        "domains": domains,
        "questions": questions,
        "flashcards": flashcards,
        "pbqs": pbqs,
        "lessons": lessons,
        "objectives": objectives
    }))
}

/// Reads the study content from the bundled resource directory. The
/// `certifications.json` manifest lists each track; per-track banks live under
/// `content/<certId>/` and are concatenated into flat arrays. Keeping content in
/// external resource files lets the banks grow or be corrected without
/// rebuilding the application binary.
#[tauri::command]
fn load_content(app: AppHandle) -> Result<Value, String> {
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("content");
    assemble_content_from_dir(&dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            import_state,
            reset_state,
            load_course_state,
            save_course_state,
            reset_course_state,
            import_learner_backup,
            load_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running SkillForge Academy");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    fn test_platform_state_path(label: &str) -> (PathBuf, PathBuf) {
        let sequence = PLATFORM_STATE_TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let directory = std::env::temp_dir().join(format!(
            "skillforge-platform-state-{label}-{}-{sequence}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).expect("test directory should be created");
        let path = directory.join("platform-state.json");
        (directory, path)
    }

    #[test]
    fn platform_state_replaces_existing_file_with_complete_json() {
        let (directory, path) = test_platform_state_path("replace");
        write_platform_state_file(&path, r#"{"first":true}"#)
            .expect("initial write should succeed");
        write_platform_state_file(&path, r#"{"second":{"complete":true}}"#)
            .expect("replacement should succeed");

        let saved: Value =
            serde_json::from_slice(&fs::read(&path).expect("replacement should exist"))
                .expect("replacement should contain complete JSON");
        assert_eq!(saved["second"]["complete"], true);
        assert!(saved.get("first").is_none());
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 1);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn overlapping_platform_state_updates_preserve_both_keys() {
        let (directory, path) = test_platform_state_path("overlap");
        let first_path = path.clone();
        let first = std::thread::spawn(move || {
            mutate_platform_state_file(&first_path, |map| {
                map.insert("first".to_string(), json!({"value": 1}));
                Ok(())
            })
        });
        let second_path = path.clone();
        let second = std::thread::spawn(move || {
            mutate_platform_state_file(&second_path, |map| {
                map.insert("second".to_string(), json!({"value": 2}));
                Ok(())
            })
        });
        first.join().unwrap().expect("first update should succeed");
        second
            .join()
            .unwrap()
            .expect("second update should succeed");

        let saved = read_platform_state_map(&path).expect("saved map should load");
        assert_eq!(saved["first"]["value"], 1);
        assert_eq!(saved["second"]["value"], 2);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn failed_platform_state_mutation_preserves_previous_file() {
        let (directory, path) = test_platform_state_path("failure");
        let original = r#"{"saved":{"valid":true}}"#;
        write_platform_state_file(&path, original).expect("initial write should succeed");
        let result = mutate_platform_state_file(&path, |_map| Err("simulated failure".to_string()));
        assert_eq!(result.unwrap_err(), "simulated failure");
        assert_eq!(fs::read_to_string(&path).unwrap(), original);
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 1);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn two_file_backup_import_rolls_back_legacy_state_when_platform_replacement_fails() {
        let (directory, _platform_path) = test_platform_state_path("backup-rollback");
        let first_path = directory.join("learner-state.json");
        let second_path = directory.join("platform-state.json");
        let first_original = br#"{"legacy":"old"}"#;
        let second_original = br#"{"platform":"old"}"#;
        fs::write(&first_path, first_original).unwrap();
        fs::write(&second_path, second_original).unwrap();
        let replace_count = AtomicU64::new(0);

        let result = replace_two_files_with(
            &first_path,
            br#"{"legacy":"new"}"#,
            &second_path,
            br#"{"platform":"new"}"#,
            |source, target| {
                if replace_count.fetch_add(1, Ordering::Relaxed) == 1 {
                    Err(io::Error::other("simulated second-file failure"))
                } else {
                    replace_platform_state_file(source, target)
                }
            },
        );

        assert!(result.unwrap_err().contains("legacy state was rolled back"));
        assert_eq!(fs::read(&first_path).unwrap(), first_original);
        assert_eq!(fs::read(&second_path).unwrap(), second_original);
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 2);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn two_file_backup_import_replaces_both_staged_files() {
        let (directory, _platform_path) = test_platform_state_path("backup-success");
        let first_path = directory.join("learner-state.json");
        let second_path = directory.join("platform-state.json");
        fs::write(&first_path, br#"{"legacy":"old"}"#).unwrap();
        fs::write(&second_path, br#"{"platform":"old"}"#).unwrap();

        replace_two_files_transactionally(
            &first_path,
            br#"{"legacy":"new"}"#,
            &second_path,
            br#"{"platform":"new"}"#,
        )
        .unwrap();

        assert_eq!(fs::read(&first_path).unwrap(), br#"{"legacy":"new"}"#);
        assert_eq!(fs::read(&second_path).unwrap(), br#"{"platform":"new"}"#);
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 2);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn platform_backup_validation_rejects_malformed_progress_and_unknown_schema() {
        let valid = json!({
            "schemaVersion": 1,
            "courseId": "skillforge-platform",
            "courseVersion": "1.0.0",
            "contentVersion": "1",
            "savedAt": "2026-10-09T00:00:00Z",
            "payload": {
                "format": "skillforge-platform-learner",
                "schemaVersion": 1,
                "savedAt": "2026-10-09T00:00:00Z",
                "legacyState": {},
                "installedPackages": [],
                "courses": {
                    "fixture@1.0.0": {
                        "progress": {
                            "courseId": "fixture",
                            "courseVersion": "1.0.0",
                            "contentVersion": "content-1",
                            "updatedAt": "2026-10-09T00:00:00Z",
                            "current": { "moduleId": "unit", "lessonId": "lesson", "activityId": "activity" },
                            "lessonProgress": {},
                            "moduleProgress": {},
                            "reviewQueue": [],
                            "sessions": [],
                            "weaknessTags": [],
                            "assistedActivityIds": []
                        }
                    }
                }
            }
        });
        assert!(valid_platform_backup_wrapper(&valid));

        let mut malformed = valid.clone();
        malformed["payload"]["courses"]["fixture@1.0.0"]["progress"]["current"]["activityId"] =
            json!("");
        assert!(!valid_platform_backup_wrapper(&malformed));
        let mut unsupported = valid;
        unsupported["payload"]["schemaVersion"] = json!(2);
        assert!(!valid_platform_backup_wrapper(&unsupported));
        let mut malformed_legacy = json!({
            "schemaVersion": 1,
            "courseId": "skillforge-platform",
            "courseVersion": "1.0.0",
            "contentVersion": "1",
            "savedAt": "2026-10-09T00:00:00Z",
            "payload": {
                "format": "skillforge-platform-learner",
                "schemaVersion": 1,
                "savedAt": "2026-10-09T00:00:00Z",
                "legacyState": { "name": "Only one weak marker" },
                "installedPackages": [],
                "courses": {}
            }
        });
        assert!(!valid_platform_backup_wrapper(&malformed_legacy));
        malformed_legacy["payload"]["legacyState"] =
            json!({ "name": "Broken", "answered": "not-a-map" });
        assert!(!valid_platform_backup_wrapper(&malformed_legacy));
        malformed_legacy["payload"]["legacyState"] = json!({ "name": "Broken", "notes": [null] });
        assert!(!valid_platform_backup_wrapper(&malformed_legacy));
        malformed_legacy["payload"]["legacyState"] = json!({
            "name": "Valid note",
            "notes": [{ "id": "n1", "title": "Title", "body": "Body", "updatedAt": "2026-10-09T00:00:00Z" }]
        });
        assert!(valid_platform_backup_wrapper(&malformed_legacy));
    }

    #[test]
    fn assemble_content_includes_objectives_array() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/content");
        let bundle = assemble_content_from_dir(&dir).expect("content dir should assemble");
        let objectives = bundle
            .get("objectives")
            .and_then(Value::as_array)
            .expect("objectives key must be an array");
        assert!(
            !objectives.is_empty(),
            "shipped tracks should contribute objectives.json entries"
        );
        for key in [
            "certifications",
            "domains",
            "questions",
            "flashcards",
            "pbqs",
            "lessons",
            "objectives",
        ] {
            assert!(bundle.get(key).is_some(), "missing content key {key}");
        }
    }
}
