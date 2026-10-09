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
static PLATFORM_STATE_TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn write_platform_state_file(path: &Path, raw: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Platform state path has no parent directory.".to_string())?;
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

        let write_result = file
            .write_all(raw.as_bytes())
            .and_then(|()| file.sync_all());
        drop(file);
        if let Err(error) = write_result {
            let _ = fs::remove_file(&temp);
            return Err(format!(
                "Could not complete platform-state temporary write: {error}"
            ));
        }

        if let Err(error) = replace_platform_state_file(&temp, path) {
            let _ = fs::remove_file(&temp);
            return Err(format!("Could not replace saved platform state: {error}"));
        }
        return Ok(());
    }

    Err("Could not allocate a unique platform-state temporary file.".to_string())
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
