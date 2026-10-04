import { deriveAcademicUnitAvailability } from "../academic/progress";
import type { AcademicUnitDefinition } from "../academic/types";
import type { Course, CourseProgress } from "../course/types";
import type { LabDefinition, LabRunState } from "./types";

export type LabAvailabilityState = "locked" | "available" | "current" | "completed" | "active" | "paused";

export interface LabAvailability {
  lab: LabDefinition;
  unit?: AcademicUnitDefinition;
  state: LabAvailabilityState;
  launchable: boolean;
  reviewOnly: boolean;
  reason: string;
}

export function deriveLabAvailability(
  lab: LabDefinition,
  unit: AcademicUnitDefinition | undefined,
  course: Course,
  progress: CourseProgress,
  existingRun?: LabRunState,
): LabAvailability {
  if (!unit || unit.id !== lab.unitId || unit.moduleId !== lab.moduleId) {
    return { lab, unit, state: "locked", launchable: false, reviewOnly: false, reason: "Lab is not mapped to a valid academic unit." };
  }
  if (existingRun?.status === "active" || existingRun?.status === "paused") {
    return { lab, unit, state: existingRun.status, launchable: true, reviewOnly: false, reason: "An existing lab run can be resumed." };
  }
  if (existingRun?.status === "completed") {
    return { lab, unit, state: "completed", launchable: true, reviewOnly: true, reason: "The completed lab remains reviewable; reset starts another attempt." };
  }
  const academic = deriveAcademicUnitAvailability(unit, course, progress);
  return {
    lab,
    unit,
    state: academic.state,
    launchable: academic.state !== "locked",
    reviewOnly: false,
    reason: academic.reason,
  };
}


