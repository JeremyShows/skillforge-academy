use chrono::Utc;
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
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

fn platform_state_map(app: &AppHandle) -> Result<serde_json::Map<String, Value>, String> {
    let path = platform_state_path(app)?;
    if !path.exists() {
        return Ok(serde_json::Map::new());
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Saved platform state")?;
    match serde_json::from_str::<Value>(&raw).map_err(|e| e.to_string())? {
        Value::Object(map) => Ok(map),
        _ => Ok(serde_json::Map::new()),
    }
}

fn valid_platform_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 256
        && key
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:@-".contains(&byte))
}

#[tauri::command]
fn load_course_state(app: AppHandle, key: String) -> Result<Value, String> {
    if !valid_platform_key(&key) {
        return Err("Invalid platform state key.".to_string());
    }
    let map = platform_state_map(&app)?;
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
    let mut map = platform_state_map(&app)?;
    map.insert(key, envelope);
    let path = platform_state_path(&app)?;
    let temp = path.with_extension("tmp");
    let raw = serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Platform state")?;
    fs::write(&temp, raw).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())?;
    Ok(json!({ "savedAt": Utc::now().to_rfc3339() }))
}

#[tauri::command]
fn reset_course_state(app: AppHandle, key: String) -> Result<(), String> {
    if !valid_platform_key(&key) {
        return Err("Invalid platform state key.".to_string());
    }
    let mut map = platform_state_map(&app)?;
    map.remove(&key);
    let path = platform_state_path(&app)?;
    let temp = path.with_extension("tmp");
    let raw = serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())?;
    assert_state_size(&raw, "Platform state")?;
    fs::write(&temp, raw).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())?;
    Ok(())
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
