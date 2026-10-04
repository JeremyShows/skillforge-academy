import {
  COURSE_PACKAGE_FORMAT,
  COURSE_PACKAGE_FORMAT_VERSION,
  PACKAGE_CAPABILITIES,
  type CoursePackageDocument,
  type CoursePackageLab,
  type CoursePackageManifest,
  type PackageCapability,
  type PackageLocation
} from "./packageTypes";

export const PACKAGE_LIMITS = {
  maxBytes: 2_000_000,
  maxStringLength: 20_000,
  maxUnits: 128,
  maxLessons: 1_024,
  maxActivities: 8_192,
  maxLectures: 512,
  maxLabs: 256,
  maxAssets: 1_024,
  maxReferences: 16_384
} as const;

const SUPPORTED_CAPABILITIES = new Set<PackageCapability>([
  "lecture-delivery", "instructor", "readings", "assignments", "assessments", "remediation", "deterministic-labs"
]);
const KNOWN_MODES = new Set(["TEACH", "SOCRATIC", "EXPLAIN", "REVIEW", "LAB", "ASSESS"]);
const FORBIDDEN_KEYS = /^(script|scripts|command|commands|shell|powershell|bash|executable|executableplugin|dynamicimport|eval|processes|processcommand|processexecution|subprocess|native|nativelibrary|dll|binary|moduleurl|endpoint|apikey|secret|token|password|credential|credentials|filepath|localpath|assetpath|env|environmentvariables)$/i;
const SECRET_VALUE = /(-----BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bsk-[A-Za-z0-9]{20,}\b)/;

export interface PackageValidationReport {
  errors: string[];
  unsupportedCapabilities: PackageCapability[];
  serializedBytes: number;
}

export interface ParsedCoursePackage {
  document?: CoursePackageDocument;
  report: PackageValidationReport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, path: string, errors: string[], required = true): string | undefined {
  if (typeof value !== "string" || (required && !value.trim())) {
    if (required) errors.push(`${path} must be a non-empty string`);
    return undefined;
  }
  if (value.length > PACKAGE_LIMITS.maxStringLength) errors.push(`${path} exceeds the string limit`);
  return value;
}

function arrayValue(value: unknown, path: string, errors: string[]): unknown[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return undefined;
  }
  return value;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? "null" : stableStringify(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

export function serializeCoursePackage(document: CoursePackageDocument): string {
  return stableStringify(document);
}

function scanForbidden(value: unknown, path: string, errors: string[], seen = new Set<object>()): void {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) errors.push(`${path} contains a secret-shaped value`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) {
    errors.push(`${path} contains a cyclic structure`);
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`, errors, seen));
  else Object.entries(value).forEach(([key, child]) => {
    if (FORBIDDEN_KEYS.test(key)) errors.push(`${path}.${key} is not allowed in a declarative package`);
    scanForbidden(child, `${path}.${key}`, errors, seen);
  });
  seen.delete(value);
}

function duplicateIds(values: { id?: unknown }[], path: string, errors: string[]): Set<string> {
  const ids = new Set<string>();
  values.forEach((value, index) => {
    const id = stringValue(value.id, `${path}[${index}].id`, errors);
    if (id && ids.has(id)) errors.push(`${path} contains duplicate id ${id}`);
    if (id) ids.add(id);
  });
  return ids;
}

function locationExists(location: unknown, path: string, unitIds: Set<string>, lessonIds: Set<string>, activityIds: Set<string>, errors: string[]): void {
  if (!isRecord(location)) {
    errors.push(`${path} must be a package location`);
    return;
  }
  const unitId = stringValue(location.unitId, `${path}.unitId`, errors);
  const lessonId = stringValue(location.lessonId, `${path}.lessonId`, errors, false);
  const activityId = stringValue(location.activityId, `${path}.activityId`, errors, false);
  if (unitId && !unitIds.has(unitId)) errors.push(`${path}.unitId references an unknown unit`);
  if (lessonId && !lessonIds.has(lessonId)) errors.push(`${path}.lessonId references an unknown lesson`);
  if (activityId && !activityIds.has(activityId)) errors.push(`${path}.activityId references an unknown activity`);
}

function validateManifest(manifest: unknown, errors: string[], unsupported: PackageCapability[]): manifest is CoursePackageManifest {
  if (!isRecord(manifest)) {
    errors.push("manifest must be an object");
    return false;
  }
  if (manifest.format !== COURSE_PACKAGE_FORMAT) errors.push(`manifest.format must be ${COURSE_PACKAGE_FORMAT}`);
  if (manifest.formatVersion !== COURSE_PACKAGE_FORMAT_VERSION) errors.push(`manifest.formatVersion ${String(manifest.formatVersion)} is unsupported`);
  const idPattern = /^[a-z0-9][a-z0-9._-]{1,95}$/;
  for (const key of ["packageId", "courseId"] as const) {
    const value = stringValue(manifest[key], `manifest.${key}`, errors);
    if (value && !idPattern.test(value)) errors.push(`manifest.${key} has an invalid identifier`);
  }
  for (const key of ["packageVersion", "courseVersion", "contentVersion", "title", "description"] as const) stringValue(manifest[key], `manifest.${key}`, errors);
  const capabilities = arrayValue(manifest.capabilities, "manifest.capabilities", errors) ?? [];
  const seen = new Set<string>();
  capabilities.forEach((capability, index) => {
    if (typeof capability !== "string" || !PACKAGE_CAPABILITIES.includes(capability as PackageCapability)) errors.push(`manifest.capabilities[${index}] is unknown`);
    else {
      if (seen.has(capability)) errors.push(`manifest.capabilities contains duplicate ${capability}`);
      seen.add(capability);
      if (!SUPPORTED_CAPABILITIES.has(capability as PackageCapability)) unsupported.push(capability as PackageCapability);
    }
  });
  if (manifest.authors !== undefined && (!Array.isArray(manifest.authors) || manifest.authors.some(author => typeof author !== "string"))) errors.push("manifest.authors must contain strings only");
  return true;
}

function validateCourse(document: Record<string, unknown>, errors: string[]): { unitIds: Set<string>; lessonIds: Set<string>; activityIds: Set<string> } {
  const course = isRecord(document.course) ? document.course : undefined;
  if (!course) {
    errors.push("course must be an object");
    return { unitIds: new Set(), lessonIds: new Set(), activityIds: new Set() };
  }
  stringValue(course.id, "course.id", errors);
  stringValue(course.title, "course.title", errors);
  stringValue(course.description, "course.description", errors);
  const units = arrayValue(course.units, "course.units", errors) ?? [];
  if (units.length > PACKAGE_LIMITS.maxUnits) errors.push("course.units exceeds the collection limit");
  const unitIds = duplicateIds(units as { id?: unknown }[], "course.units", errors);
  const lessonRows: Record<string, unknown>[] = [];
  const activityRows: Record<string, unknown>[] = [];
  units.forEach((unit, unitIndex) => {
    if (!isRecord(unit)) {
      errors.push(`course.units[${unitIndex}] must be an object`);
      return;
    }
    stringValue(unit.title, `course.units[${unitIndex}].title`, errors);
    stringValue(unit.description, `course.units[${unitIndex}].description`, errors);
    const lessons = arrayValue(unit.lessons, `course.units[${unitIndex}].lessons`, errors) ?? [];
    lessons.forEach(lesson => { if (isRecord(lesson)) { lessonRows.push(lesson); const activities = Array.isArray(lesson.activities) ? lesson.activities : []; activities.forEach(activity => { if (isRecord(activity)) activityRows.push(activity); }); } });
  });
  if (lessonRows.length > PACKAGE_LIMITS.maxLessons) errors.push("course lessons exceed the collection limit");
  if (activityRows.length > PACKAGE_LIMITS.maxActivities) errors.push("course activities exceed the collection limit");
  const lessonIds = duplicateIds(lessonRows, "course.lessons", errors);
  const activityIds = duplicateIds(activityRows, "course.activities", errors);
  units.forEach((unit, unitIndex) => {
    if (!isRecord(unit) || !Array.isArray(unit.lessons)) return;
    unit.lessons.forEach((lesson, lessonIndex) => {
      if (!isRecord(lesson)) { errors.push(`course.units[${unitIndex}].lessons[${lessonIndex}] must be an object`); return; }
      stringValue(lesson.title, `course.units[${unitIndex}].lessons[${lessonIndex}].title`, errors);
      stringValue(lesson.summary, `course.units[${unitIndex}].lessons[${lessonIndex}].summary`, errors);
      if (!Array.isArray(lesson.objectives) || lesson.objectives.some(item => typeof item !== "string")) errors.push(`course lesson ${String(lesson.id)} objectives must be strings`);
      if (!Array.isArray(lesson.activities)) { errors.push(`course lesson ${String(lesson.id)} activities must be an array`); return; }
      lesson.activities.forEach((activity, activityIndex) => {
        if (!isRecord(activity)) { errors.push(`course lesson ${String(lesson.id)} activity ${activityIndex} must be an object`); return; }
        stringValue(activity.type, `activity ${String(activity.id)}.type`, errors);
        stringValue(activity.title, `activity ${String(activity.id)}.title`, errors);
        if (typeof activity.estimatedMinutes !== "number" || activity.estimatedMinutes < 0 || activity.estimatedMinutes > 600) errors.push(`activity ${String(activity.id)}.estimatedMinutes is invalid`);
        if (activity.source !== undefined) locationExists(activity.source, `activity ${String(activity.id)}.source`, unitIds, lessonIds, activityIds, errors);
      });
    });
  });
  if (Array.isArray(course.prerequisites)) course.prerequisites.forEach((item, index) => {
    if (!isRecord(item)) { errors.push(`course.prerequisites[${index}] must be an object`); return; }
    for (const key of ["requiredUnitIds", "requiredLessonIds"] as const) if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].some(id => typeof id !== "string"))) errors.push(`course.prerequisites[${index}].${key} must contain strings`);
    (item.requiredUnitIds as unknown[] | undefined)?.forEach(id => { if (!unitIds.has(String(id))) errors.push(`prerequisite references unknown unit ${String(id)}`); });
    (item.requiredLessonIds as unknown[] | undefined)?.forEach(id => { if (!lessonIds.has(String(id))) errors.push(`prerequisite references unknown lesson ${String(id)}`); });
  });
  return { unitIds, lessonIds, activityIds };
}

function validateLectures(document: Record<string, unknown>, unitIds: Set<string>, lessonIds: Set<string>, activityIds: Set<string>, errors: string[]): void {
  if (document.lectures === undefined) return;
  const catalog = isRecord(document.lectures) ? document.lectures : undefined;
  const lectures = catalog && Array.isArray(catalog.lectures) ? catalog.lectures : [];
  if (!catalog || typeof catalog.version !== "string") errors.push("lectures.version must be a string");
  if (lectures.length > PACKAGE_LIMITS.maxLectures) errors.push("lectures exceed the collection limit");
  const ids = duplicateIds(lectures as { id?: unknown }[], "lectures", errors);
  void ids;
  lectures.forEach((lecture, index) => {
    if (!isRecord(lecture)) { errors.push(`lectures[${index}] must be an object`); return; }
    const unitId = stringValue(lecture.unitId, `lectures[${index}].unitId`, errors);
    if (unitId && !unitIds.has(unitId)) errors.push(`lecture ${String(lecture.id)} references an unknown unit`);
    if (!Array.isArray(lecture.lessonIds) || lecture.lessonIds.some(id => typeof id !== "string" || !lessonIds.has(id))) errors.push(`lecture ${String(lecture.id)} has an invalid lesson relationship`);
    if (!Array.isArray(lecture.segments)) { errors.push(`lecture ${String(lecture.id)}.segments must be an array`); return; }
    lecture.segments.forEach(segment => {
      if (!isRecord(segment)) { errors.push(`lecture ${String(lecture.id)} has a malformed segment`); return; }
      if (segment.lessonId !== undefined && (typeof segment.lessonId !== "string" || !lessonIds.has(segment.lessonId))) errors.push(`lecture ${String(lecture.id)} has an invalid segment lesson reference`);
      if (segment.activityId !== undefined && (typeof segment.activityId !== "string" || !activityIds.has(segment.activityId))) errors.push(`lecture ${String(lecture.id)} has an invalid segment activity reference`);
    });
  });
}

function validateLocations(collection: unknown, path: string, unitIds: Set<string>, lessonIds: Set<string>, activityIds: Set<string>, errors: string[]): void {
  if (collection === undefined) return;
  if (!Array.isArray(collection)) { errors.push(`${path} must be an array`); return; }
  if (collection.length > PACKAGE_LIMITS.maxReferences) errors.push(`${path} exceeds the collection limit`);
  collection.forEach((item, index) => { if (isRecord(item)) locationExists(item.source, `${path}[${index}].source`, unitIds, lessonIds, activityIds, errors); else errors.push(`${path}[${index}] must be an object`); });
}

function validateInstructor(instructor: unknown, errors: string[]): void {
  if (instructor === undefined) return;
  if (!isRecord(instructor)) { errors.push("instructor must be an object"); return; }
  stringValue(instructor.id, "instructor.id", errors);
  stringValue(instructor.displayRole, "instructor.displayRole", errors);
  stringValue(instructor.subjectScope, "instructor.subjectScope", errors);
  stringValue(instructor.fallbackLanguage, "instructor.fallbackLanguage", errors);
  if (!Array.isArray(instructor.allowedModes) || instructor.allowedModes.some(mode => typeof mode !== "string" || !KNOWN_MODES.has(mode))) errors.push("instructor.allowedModes contains an unknown mode");
  if (!Array.isArray(instructor.pedagogicalInstructions) || instructor.pedagogicalInstructions.some(item => typeof item !== "string")) errors.push("instructor.pedagogicalInstructions must contain strings");
}

function validateLabs(labs: unknown, unitIds: Set<string>, lessonIds: Set<string>, activityIds: Set<string>, manifest: CoursePackageManifest | undefined, errors: string[]): void {
  if (labs === undefined) return;
  if (!isRecord(labs) || typeof labs.version !== "string" || typeof labs.runtimeVersion !== "string" || !Array.isArray(labs.labs)) { errors.push("labs catalog is malformed"); return; }
  if (manifest && labs.courseId !== manifest.courseId) errors.push("labs.courseId must match manifest.courseId");
  if (labs.labs.length > PACKAGE_LIMITS.maxLabs) errors.push("labs exceed the collection limit");
  labs.labs.forEach((lab, labIndex) => {
    if (!isRecord(lab)) { errors.push(`labs[${labIndex}] must be an object`); return; }
    stringValue(lab.id, `labs[${labIndex}].id`, errors);
    stringValue(lab.title, `labs[${labIndex}].title`, errors);
    const unitId = stringValue(lab.unitId, `labs[${labIndex}].unitId`, errors);
    if (unitId && !unitIds.has(unitId)) errors.push(`lab ${String(lab.id)} references an unknown unit`);
    locationExists(lab.sourceLocation, `labs[${labIndex}].sourceLocation`, unitIds, lessonIds, activityIds, errors);
    const typedLab = lab as unknown as CoursePackageLab;
    const actionIds = duplicateIds(Array.isArray(typedLab.actions) ? typedLab.actions : [], `labs[${labIndex}].actions`, errors);
    const checkIds = duplicateIds(Array.isArray(typedLab.checks) ? typedLab.checks : [], `labs[${labIndex}].checks`, errors);
    const stepIds = duplicateIds(Array.isArray(typedLab.steps) ? typedLab.steps : [], `labs[${labIndex}].steps`, errors);
    if (!Array.isArray(typedLab.requiredStepIds) || typedLab.requiredStepIds.some(id => !stepIds.has(id))) errors.push(`lab ${String(lab.id)} has an invalid required step`);
    typedLab.steps?.forEach(step => {
      if (!stepIds.has(step.id)) return;
      locationExists(step.sourceLocation, `lab ${String(lab.id)} step ${step.id}.sourceLocation`, unitIds, lessonIds, activityIds, errors);
      step.actionIds?.forEach(id => { if (!actionIds.has(id)) errors.push(`lab ${String(lab.id)} step ${step.id} references unknown action ${id}`); });
      step.checkIds?.forEach(id => { if (!checkIds.has(id)) errors.push(`lab ${String(lab.id)} step ${step.id} references unknown check ${id}`); });
    });
    typedLab.actions?.forEach(action => action.effects?.forEach(effect => { if (!effect.key) errors.push(`lab ${String(lab.id)} has an effect without a state key`); }));
  });
}

export function validateCoursePackage(input: unknown): PackageValidationReport {
  const errors: string[] = [];
  const unsupportedCapabilities: PackageCapability[] = [];
  if (!isRecord(input)) return { errors: ["package must be an object"], unsupportedCapabilities, serializedBytes: 0 };
  const serialized = stableStringify(input);
  const serializedBytes = new TextEncoder().encode(serialized).byteLength;
  if (serializedBytes > PACKAGE_LIMITS.maxBytes) errors.push(`package exceeds ${PACKAGE_LIMITS.maxBytes} bytes`);
  scanForbidden(input, "package", errors);
  const manifest = validateManifest(input.manifest, errors, unsupportedCapabilities) ? input.manifest : undefined;
  const refs = validateCourse(input, errors);
  if (manifest && isRecord(input.course) && input.course.id !== manifest.courseId) errors.push("course.id must match manifest.courseId");
  validateInstructor(input.instructor, errors);
  validateLectures(input, refs.unitIds, refs.lessonIds, refs.activityIds, errors);
  validateLocations(input.readings, "readings", refs.unitIds, refs.lessonIds, refs.activityIds, errors);
  validateLocations(input.assignments, "assignments", refs.unitIds, refs.lessonIds, refs.activityIds, errors);
  validateLocations(input.assessments, "assessments", refs.unitIds, refs.lessonIds, refs.activityIds, errors);
  validateLocations(input.remediation, "remediation", refs.unitIds, refs.lessonIds, refs.activityIds, errors);
  validateLabs(input.labs, refs.unitIds, refs.lessonIds, refs.activityIds, manifest, errors);
  if (Array.isArray(input.assets) && input.assets.length > PACKAGE_LIMITS.maxAssets) errors.push("assets exceed the collection limit");
  return { errors: [...new Set(errors)], unsupportedCapabilities: [...new Set(unsupportedCapabilities)], serializedBytes };
}

export function parseCoursePackage(text: string): ParsedCoursePackage {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > PACKAGE_LIMITS.maxBytes) return { report: { errors: [`package exceeds ${PACKAGE_LIMITS.maxBytes} bytes before parsing`], unsupportedCapabilities: [], serializedBytes: bytes } };
  try {
    const document: unknown = JSON.parse(text);
    const report = validateCoursePackage(document);
    return { document: report.errors.length ? undefined : document as CoursePackageDocument, report };
  } catch {
    return { report: { errors: ["package is not valid JSON"], unsupportedCapabilities: [], serializedBytes: bytes } };
  }
}

export async function sha256CoursePackage(document: CoursePackageDocument): Promise<string> {
  const bytes = new TextEncoder().encode(serializeCoursePackage(document));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

export function isPackageLocation(value: unknown): value is PackageLocation {
  return isRecord(value) && typeof value.unitId === "string";
}
