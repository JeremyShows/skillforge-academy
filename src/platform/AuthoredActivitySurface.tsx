import type { CourseActivity } from "../course/types";
import { isFormalActivity } from "./runtime";

export interface AuthoredActivitySurfaceProps {
  activity: CourseActivity;
  response: string;
  onResponseChange: (response: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  submitLabel?: string;
  contextLabel?: string;
}

function activityBody(activity: CourseActivity): string {
  if ("body" in activity && activity.body) return activity.body;
  if ("prompt" in activity && activity.prompt) return activity.prompt;
  if (activity.type === "remediation") return activity.practicePrompt;
  return "Complete the authored activity.";
}

function responsePrompt(activity: CourseActivity): string | undefined {
  if ("responsePrompt" in activity && activity.responsePrompt) return activity.responsePrompt;
  if (activity.type === "remediation") return activity.practicePrompt;
  if ("prompt" in activity && activity.prompt) return activity.prompt;
  return undefined;
}

function needsResponse(activity: CourseActivity): boolean {
  return activity.type !== "instruction" && activity.type !== "concept_explanation";
}

export function AuthoredActivitySurface({ activity, response, onResponseChange, onSubmit, onClose, submitLabel, contextLabel }: AuthoredActivitySurfaceProps) {
  const responseRequired = needsResponse(activity);
  const prompt = responsePrompt(activity);
  return <article className="platform-panel" aria-label="Authored activity">
    <h2>{activity.title}</h2>
    <p>{activityBody(activity)}</p>
    {contextLabel && <p><strong>{contextLabel}</strong></p>}
    {isFormalActivity(activity) && <p><strong>Formal activity:</strong> this response is evaluated by the authored CourseProgress runtime.</p>}
    {prompt && activityBody(activity) !== prompt && <p><strong>Response prompt:</strong> {prompt}</p>}
    {responseRequired && <textarea aria-label="Authored activity response" value={response} onChange={event => onResponseChange(event.target.value)} placeholder="Respond to the authored prompt…" />}
    <div className="platform-action-row">
      <button className="platform-primary" onClick={onSubmit} disabled={responseRequired && !response.trim()}>{submitLabel ?? (isFormalActivity(activity) ? "Submit authored response" : "Record authored activity")}</button>
      {onClose && <button className="platform-secondary" onClick={onClose}>Close activity</button>}
    </div>
  </article>;
}
