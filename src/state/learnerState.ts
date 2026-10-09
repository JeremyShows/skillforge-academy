import { invoke } from "@tauri-apps/api/core";

export const LEARNER_STATE_SCHEMA_VERSION = 1;

export interface LearnerStateEnvelope<T> {
  schemaVersion: number;
  courseId: string;
  courseVersion: string;
  contentVersion: string;
  savedAt: string;
  payload: T;
}

export interface LearnerStateLoad<T = unknown> {
  payload: T | null;
  recovered: boolean;
  error?: string;
  envelope?: Omit<LearnerStateEnvelope<T>, "payload">;
}

export interface LearnerStateStore {
  load<T>(key: string): Promise<LearnerStateLoad<T>>;
  save<T>(key: string, metadata: Pick<LearnerStateEnvelope<T>, "courseId" | "courseVersion" | "contentVersion">, payload: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export function isNativeLearnerStateStore(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function envelope<T>(metadata: Pick<LearnerStateEnvelope<T>, "courseId" | "courseVersion" | "contentVersion">, payload: T): LearnerStateEnvelope<T> {
  return {
    schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
    ...metadata,
    savedAt: new Date().toISOString(),
    payload,
  };
}

function parseEnvelope<T>(raw: string): LearnerStateLoad<T> | null {
  try {
    const value = JSON.parse(raw) as Partial<LearnerStateEnvelope<T>> & { payload?: T };
    if (!value || typeof value !== "object") return null;
    // A legacy progress object is returned as payload so the caller can migrate it
    // into the versioned envelope without losing an existing browser-only session.
    if (value.schemaVersion === undefined && "courseId" in value) {
      return { payload: value as T, recovered: false };
    }
    if (value.schemaVersion !== LEARNER_STATE_SCHEMA_VERSION || !value.payload || typeof value.payload !== "object") return null;
    if (typeof value.courseId !== "string" || typeof value.courseVersion !== "string" || typeof value.contentVersion !== "string") return null;
    return {
      payload: value.payload,
      recovered: false,
      envelope: {
        schemaVersion: value.schemaVersion,
        courseId: value.courseId,
        courseVersion: value.courseVersion,
        contentVersion: value.contentVersion,
        savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
      },
    };
  } catch {
    return null;
  }
}

class BrowserLearnerStateStore implements LearnerStateStore {
  private backupKey(key: string): string { return `${key}:backup`; }

  async load<T>(key: string): Promise<LearnerStateLoad<T>> {
    let invalidCopyFound = false;
    try {
      const current = localStorage.getItem(key);
      if (current !== null) {
        const parsed = parseEnvelope<T>(current);
        if (parsed) return parsed;
        invalidCopyFound = true;
      }
      const backup = localStorage.getItem(this.backupKey(key));
      if (backup !== null) {
        const parsed = parseEnvelope<T>(backup);
        if (parsed) return { ...parsed, recovered: true };
        invalidCopyFound = true;
      }
    } catch {
      return { payload: null, recovered: false, error: "Browser learner storage could not be read." };
    }
    return invalidCopyFound
      ? { payload: null, recovered: false, error: "Saved learner data is unreadable and no valid backup copy could be recovered." }
      : { payload: null, recovered: false };
  }

  async save<T>(key: string, metadata: Pick<LearnerStateEnvelope<T>, "courseId" | "courseVersion" | "contentVersion">, payload: T): Promise<void> {
    const next = JSON.stringify(envelope(metadata, payload));
    const current = localStorage.getItem(key);
    if (current) localStorage.setItem(this.backupKey(key), current);
    localStorage.setItem(key, next);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
    localStorage.removeItem(this.backupKey(key));
  }
}

class TauriLearnerStateStore implements LearnerStateStore {
  async load<T>(key: string): Promise<LearnerStateLoad<T>> {
    const result = await invoke<{ payload?: T | null; recovered?: boolean; error?: string }>("load_course_state", { key });
    if (!result) return { payload: null, recovered: false };
    return {
      payload: result.payload ?? null,
      recovered: result.recovered === true,
      error: typeof result.error === "string" ? result.error : undefined
    };
  }

  async save<T>(key: string, metadata: Pick<LearnerStateEnvelope<T>, "courseId" | "courseVersion" | "contentVersion">, payload: T): Promise<void> {
    await invoke("save_course_state", { key, envelope: envelope(metadata, payload) });
  }

  async remove(key: string): Promise<void> {
    await invoke("reset_course_state", { key });
  }
}

let cachedStore: LearnerStateStore | undefined;

export function learnerStateStore(): LearnerStateStore {
  if (!cachedStore) cachedStore = isNativeLearnerStateStore() ? new TauriLearnerStateStore() : new BrowserLearnerStateStore();
  return cachedStore;
}

export function resetLearnerStateStoreForTests(): void {
  cachedStore = undefined;
}

