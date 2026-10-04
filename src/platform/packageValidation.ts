import {
  COURSE_PACKAGE_FORMAT, COURSE_PACKAGE_FORMAT_VERSION, PACKAGE_CAPABILITIES,
  type CoursePackageDocument, type CoursePackageLab, type CoursePackageManifest, type PackageCapability, type PackageLocation
} from "./packageTypes";

export const PACKAGE_LIMITS = {
  maxBytes: 2_000_000, maxStringLength: 20_000, maxUnits: 128, maxLessons: 1_024,
  maxActivities: 8_192, maxLectures: 512, maxLabs: 256, maxAssets: 1_024, maxReferences: 16_384
} as const;
const SUPPORTED_CAPABILITIES = new Set<PackageCapability>(["lecture-delivery", "instructor", "readings", "assignments", "assessments", "remediation", "deterministic-labs"]);
const FORBIDDEN_KEYS = /^(script|scripts|command|commands|shell|powershell|bash|executable|executableplugin|dynamicimport|eval|processes|processcommand|processexecution|subprocess|native|nativelibrary|dll|binary|moduleurl|endpoint|apikey|secret|token|password|credential|credentials|filepath|localpath|assetpath|env|environmentvariables)$/i;
const SECRET_VALUE = /(-----BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bsk-[A-Za-z0-9]{20,}\b)/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const ID = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const LECTURE_KINDS = new Set(["opening","lecture","explanation","diagram","worked-trace","code-walkthrough","demonstration","pause-and-predict","socratic-question","knowledge-check","guided-practice","independent-practice","assessment","remediation","recap","closing"]);
const LAB_KINDS = new Set(["briefing","prediction","action","observation","check","reflection","formal-activity"]);
const LAB_OPERATORS = new Set(["equals","not-equals","greater-than","less-than"]);
const INSTRUCTOR_MODES = new Set(["TEACH","CLARIFY","EXPLAIN_DIFFERENTLY","HINT","SOCRATIC","WORKED_EXAMPLE","CONNECT_TO_EXPERIENCE","CHALLENGE","REMEDIATE","RECAP","OFFICE_HOURS"]);

export interface PackageValidationReport { errors: string[]; unsupportedCapabilities: PackageCapability[]; serializedBytes: number; }
export interface ParsedCoursePackage { document?: CoursePackageDocument; report: PackageValidationReport; }

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function stringValue(value: unknown, path: string, errors: string[], required = true): string | undefined {
  if (typeof value !== "string" || (required && !value.trim())) { if (required) errors.push(`${path} must be a non-empty string`); return undefined; }
  if (value.length > PACKAGE_LIMITS.maxStringLength) errors.push(`${path} exceeds the string limit`);
  return value;
}
function arrayValue(value: unknown, path: string, errors: string[], required = true): unknown[] | undefined {
  if (!Array.isArray(value)) { if (required) errors.push(`${path} must be an array`); return undefined; }
  return value;
}
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? "null" : stableStringify(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}
export function serializeCoursePackage(document: CoursePackageDocument): string { return stableStringify(document); }

function unknownFields(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) if (!known.has(key)) errors.push(`${path}.${key} is an unknown field; use extensionMetadata for extensions`);
}
function scanForbidden(value: unknown, path: string, errors: string[], seen = new Set<object>()): void {
  if (typeof value === "string") { if (SECRET_VALUE.test(value)) errors.push(`${path} contains a secret-shaped value`); return; }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) { errors.push(`${path} contains a cyclic structure`); return; }
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => scanForbidden(item, `${path}[${index}]`, errors, seen));
  else Object.entries(value).forEach(([key, child]) => { if (FORBIDDEN_KEYS.test(key)) errors.push(`${path}.${key} is not allowed in a declarative package`); scanForbidden(child, `${path}.${key}`, errors, seen); });
  seen.delete(value);
}
function ids(rows: unknown[], path: string, errors: string[]): Set<string> {
  const result = new Set<string>();
  rows.forEach((value, index) => {
    if (!record(value)) { errors.push(`${path}[${index}] must be an object`); return; }
    const id = stringValue(value.id, `${path}[${index}].id`, errors);
    if (id && !ID.test(id)) errors.push(`${path}[${index}].id has an invalid identifier`);
    if (id && result.has(id)) errors.push(`${path} contains duplicate id ${id}`);
    if (id) result.add(id);
  });
  return result;
}
function validateManifest(value: unknown, errors: string[], unsupported: PackageCapability[]): value is CoursePackageManifest {
  if (!record(value)) { errors.push("manifest must be an object"); return false; }
  unknownFields(value, ["format","formatVersion","packageId","packageVersion","courseId","courseVersion","contentVersion","title","description","publisher","authors","license","minimumSkillForgeVersion","capabilities","visibilityMetadata","createdAt","provenance","extensionMetadata"], "manifest", errors);
  if (value.format !== COURSE_PACKAGE_FORMAT) errors.push(`manifest.format must be ${COURSE_PACKAGE_FORMAT}`);
  if (value.formatVersion !== COURSE_PACKAGE_FORMAT_VERSION) errors.push(`manifest.formatVersion ${String(value.formatVersion)} is unsupported`);
  for (const key of ["packageId","courseId"] as const) { const id = stringValue(value[key], `manifest.${key}`, errors); if (id && !ID.test(id)) errors.push(`manifest.${key} has an invalid identifier`); }
  for (const key of ["packageVersion","courseVersion","contentVersion","title","description"] as const) { const text = stringValue(value[key], `manifest.${key}`, errors); if (["packageVersion","courseVersion"].includes(key) && text && !VERSION.test(text)) errors.push(`manifest.${key} must use major.minor.patch version grammar`); }
  const capabilities = arrayValue(value.capabilities, "manifest.capabilities", errors) ?? [];
  const seen = new Set<string>();
  capabilities.forEach((capability, index) => {
    if (typeof capability !== "string" || !PACKAGE_CAPABILITIES.includes(capability as PackageCapability)) errors.push(`manifest.capabilities[${index}] is unknown`);
    else { if (seen.has(capability)) errors.push(`manifest.capabilities contains duplicate ${capability}`); seen.add(capability); if (!SUPPORTED_CAPABILITIES.has(capability as PackageCapability)) unsupported.push(capability as PackageCapability); }
  });
  if (value.authors !== undefined && (!Array.isArray(value.authors) || value.authors.some(item => typeof item !== "string"))) errors.push("manifest.authors must contain strings only");
  if (record(value.visibilityMetadata)) unknownFields(value.visibilityMetadata, ["audience","builtIn","extensionMetadata"], "manifest.visibilityMetadata", errors);
  if (record(value.provenance)) unknownFields(value.provenance, ["source","sha256","signatureStatus","sourceRevision","extensionMetadata"], "manifest.provenance", errors);
  return true;
}

interface Hierarchy {
  unitIds: Set<string>; lessonIds: Set<string>; activityIds: Set<string>;
  lessonUnit: Map<string,string>; activityLesson: Map<string,string>; activityUnit: Map<string,string>;
}
function validateCourse(value: unknown, errors: string[]): Hierarchy {
  const empty: Hierarchy = { unitIds: new Set(), lessonIds: new Set(), activityIds: new Set(), lessonUnit: new Map(), activityLesson: new Map(), activityUnit: new Map() };
  if (!record(value)) { errors.push("course must be an object"); return empty; }
  unknownFields(value, ["id","title","description","subtitle","subject","level","audience","type","outcomes","estimatedTotalMinutes","units","prerequisites","placement","capstone","finalAssessment","metadata","extensionMetadata"], "course", errors);
  for (const key of ["id","title","description"] as const) stringValue(value[key], `course.${key}`, errors);
  const units = arrayValue(value.units, "course.units", errors) ?? [];
  if (units.length > PACKAGE_LIMITS.maxUnits) errors.push("course.units exceeds the collection limit");
  const unitIds = ids(units, "course.units", errors);
  const lessonIds = new Set<string>(), activityIds = new Set<string>(), lessonUnit = new Map<string,string>(), activityLesson = new Map<string,string>(), activityUnit = new Map<string,string>();
  let lessonCount=0, activityCount=0;
  units.forEach((unit, ui) => {
    if (!record(unit)) return;
    unknownFields(unit, ["id","title","description","lessons","prerequisites","masteryRequirements","moduleAssessment","extensionMetadata"], `course.units[${ui}]`, errors);
    stringValue(unit.title, `course.units[${ui}].title`, errors); stringValue(unit.description, `course.units[${ui}].description`, errors);
    const lessons = arrayValue(unit.lessons, `course.units[${ui}].lessons`, errors) ?? [];
    lessonCount += lessons.length; if (lessonCount > PACKAGE_LIMITS.maxLessons) errors.push("course lessons exceed the collection limit");
    lessons.forEach((lesson, li) => {
      if (!record(lesson)) { errors.push(`course.units[${ui}].lessons[${li}] must be an object`); return; }
      unknownFields(lesson, ["id","title","summary","objectives","activities","prerequisites","concepts","tags","masteryRule","extensionMetadata"], `course.units[${ui}].lessons[${li}]`, errors);
      const lessonId = stringValue(lesson.id, `course.units[${ui}].lessons[${li}].id`, errors);
      stringValue(lesson.title, `course.units[${ui}].lessons[${li}].title`, errors); stringValue(lesson.summary, `course.units[${ui}].lessons[${li}].summary`, errors);
      if (record(lesson.masteryRule)) { unknownFields(lesson.masteryRule,["gateActivityId","criteria","passScore","requiredActivityIds","retryPolicy","remediationActivityId","extensionMetadata"],`course.units[${ui}].lessons[${li}].masteryRule`,errors); stringValue(lesson.masteryRule.gateActivityId,`course.units[${ui}].lessons[${li}].masteryRule.gateActivityId`,errors); if(typeof lesson.masteryRule.passScore!=="number"||lesson.masteryRule.passScore<0||lesson.masteryRule.passScore>1)errors.push(`course.units[${ui}].lessons[${li}].masteryRule.passScore must be between 0 and 1`); if(!["same-lesson","remediate-then-retry"].includes(String(lesson.masteryRule.retryPolicy)))errors.push(`course.units[${ui}].lessons[${li}].masteryRule.retryPolicy is unknown`); if(Array.isArray(lesson.masteryRule.criteria)) lesson.masteryRule.criteria.forEach((criterion,index)=>{if(record(criterion))unknownFields(criterion,["id","description","required","evidence","keywords","patterns","extensionMetadata"],`course.units[${ui}].lessons[${li}].masteryRule.criteria[${index}]`,errors);}); }
      if (lessonId) { if (lessonIds.has(lessonId)) errors.push(`course.lessons contains duplicate id ${lessonId}`); lessonIds.add(lessonId); lessonUnit.set(lessonId, String(unit.id)); }
      const activities = arrayValue(lesson.activities, `course.units[${ui}].lessons[${li}].activities`, errors) ?? [];
      activityCount += activities.length; if (activityCount > PACKAGE_LIMITS.maxActivities) errors.push("course activities exceed the collection limit");
      activities.forEach((activity, ai) => {
        if (!record(activity)) { errors.push(`course.units[${ui}].lessons[${li}].activities[${ai}] must be an object`); return; }
        unknownFields(activity, ["id","type","title","estimatedMinutes","body","prompt","objectiveIds","conceptIds","tags","source","required","formal","masteryRubric","responseGuide","scenario","responseType","responsePrompt","expectedReasoning","options","passScore","assessmentId","returnToActivityId","successSignal","blocks","stages","extensionMetadata"], `course.units[${ui}].lessons[${li}].activities[${ai}]`, errors);
        const activityId = stringValue(activity.id, `course.units[${ui}].lessons[${li}].activities[${ai}].id`, errors);
        stringValue(activity.type, `course.units[${ui}].lessons[${li}].activities[${ai}].type`, errors); stringValue(activity.title, `course.units[${ui}].lessons[${li}].activities[${ai}].title`, errors);
        if (activityId) { if (activityIds.has(activityId)) errors.push(`course.activities contains duplicate id ${activityId}`); activityIds.add(activityId); activityLesson.set(activityId, String(lesson.id)); activityUnit.set(activityId, String(unit.id)); }
        if (record(activity.source)) checkLocation(activity.source, `course.units[${ui}].lessons[${li}].activities[${ai}].source`, {unitIds,lessonIds,activityIds,lessonUnit,activityLesson,activityUnit}, errors, true);
      });
    });
  });
  const hierarchy={unitIds,lessonIds,activityIds,lessonUnit,activityLesson,activityUnit};
  units.forEach((unit, ui) => { if (record(unit) && unit.moduleAssessment !== undefined) validateAssessment(unit.moduleAssessment, `course.units[${ui}].moduleAssessment`, hierarchy, errors); });
  for (const row of [value.capstone, value.finalAssessment]) if (row !== undefined) validateAssessment(row, "course.assessment", hierarchy, errors);
  return hierarchy;
}
function checkLocation(value: unknown, path: string, h: Hierarchy, errors: string[], requireActivity = false): void {
  if (!record(value)) { errors.push(`${path} must be a package location`); return; }
  unknownFields(value, ["unitId","lessonId","activityId","extensionMetadata"], path, errors);
  const unit = stringValue(value.unitId, `${path}.unitId`, errors);
  const lesson = stringValue(value.lessonId, `${path}.lessonId`, errors, false);
  const activity = stringValue(value.activityId, `${path}.activityId`, errors, requireActivity);
  if (unit && !h.unitIds.has(unit)) errors.push(`${path}.unitId references an unknown unit`);
  if (lesson && !h.lessonIds.has(lesson)) errors.push(`${path}.lessonId references an unknown lesson`);
  if (activity && !h.activityIds.has(activity)) errors.push(`${path}.activityId references an unknown activity`);
  if (lesson && unit && h.lessonUnit.get(lesson) !== unit) errors.push(`${path} has an invalid lesson relationship with its unit`);
  if (activity && lesson && h.activityLesson.get(activity) !== lesson) errors.push(`${path} has an invalid activity relationship with its lesson`);
  if (activity && unit && h.activityUnit.get(activity) !== unit) errors.push(`${path} has an invalid activity relationship with its unit`);
  if (activity && !lesson) errors.push(`${path}.lessonId is required when activityId is present`);
}
function validateAssessment(value: unknown, path: string, h: Hierarchy, errors: string[]): void {
  if (!record(value)) { errors.push(`${path} must be an object`); return; }
  unknownFields(value, ["id","title","instructions","source","rubric","unitId","kind","sourceActivityIds","required","passScore","description","prompt","scenario","conceptIds","responseGuide","finalIntegration","novelScenario","blocks","sourceLessonIds","masteryRubric","stages","extensionMetadata"], path, errors);
  stringValue(value.id, `${path}.id`, errors); stringValue(value.title, `${path}.title`, errors); stringValue(value.instructions, `${path}.instructions`, errors);
  checkLocation(value.source, `${path}.source`, h, errors, true);
  if (!Array.isArray(value.rubric)) errors.push(`${path}.rubric must be an array`);
  if (value.sourceActivityIds !== undefined && Array.isArray(value.sourceActivityIds)) value.sourceActivityIds.forEach((id,index)=>{ if(typeof id!=="string" || !h.activityIds.has(id)) errors.push(`${path}.sourceActivityIds[${index}] references an unknown activity`); });
  if (value.passScore !== undefined && (typeof value.passScore !== "number" || value.passScore < 0 || value.passScore > 1)) errors.push(`${path}.passScore must be between 0 and 1`);
}
function validateLecture(value: unknown, h: Hierarchy, errors: string[]): void {
  if (!record(value)) { errors.push("lectures must be an object"); return; }
  unknownFields(value, ["version","lectures","extensionMetadata"], "lectures", errors);
  const lectures=arrayValue(value.lectures,"lectures.lectures",errors)??[]; if(lectures.length>PACKAGE_LIMITS.maxLectures) errors.push("lectures exceeds the collection limit");
  const lectureIds=ids(lectures,"lectures.lectures",errors);
  lectures.forEach((row,i)=>{ if(!record(row)) return; unknownFields(row,["id","title","version","unitId","lessonIds","segments","estimatedMinutes","extensionMetadata"],`lectures.lectures[${i}]`,errors); const unit=stringValue(row.unitId,`lectures.lectures[${i}].unitId`,errors); if(unit&&!h.unitIds.has(unit)) errors.push(`lectures.lectures[${i}].unitId references an unknown unit`); const lessonIds=arrayValue(row.lessonIds,`lectures.lectures[${i}].lessonIds`,errors)??[]; lessonIds.forEach((id,j)=>{if(typeof id!=="string"||!h.lessonIds.has(id))errors.push(`lectures.lectures[${i}].lessonIds[${j}] references an unknown lesson`);else if(unit&&h.lessonUnit.get(id)!==unit)errors.push(`lectures.lectures[${i}].lessonIds[${j}] has an invalid lesson relationship`);}); const segments=arrayValue(row.segments,`lectures.lectures[${i}].segments`,errors)??[]; segments.forEach((segment,j)=>{if(!record(segment)){errors.push(`lectures.lectures[${i}].segments[${j}] must be an object`);return;} unknownFields(segment,["id","kind","title","body","source","lessonId","activityId","required","authoredContent","interaction","references","extensionMetadata"],`lectures.lectures[${i}].segments[${j}]`,errors); if(typeof segment.kind!=="string"||!LECTURE_KINDS.has(segment.kind))errors.push(`lectures.lectures[${i}].segments[${j}].kind is unknown`); if(record(segment.authoredContent)) unknownFields(segment.authoredContent,["prose","diagram","trace","code","extensionMetadata"],`lectures.lectures[${i}].segments[${j}].authoredContent`,errors); if(record(segment.interaction)) unknownFields(segment.interaction,["prompt","responseType","options","extensionMetadata"],`lectures.lectures[${i}].segments[${j}].interaction`,errors); if(segment.source!==undefined)checkLocation(segment.source,`lectures.lectures[${i}].segments[${j}].source`,h,errors,false); else if(segment.lessonId!==undefined||segment.activityId!==undefined)checkLocation({unitId:unit,lessonId:segment.lessonId,activityId:segment.activityId},`lectures.lectures[${i}].segments[${j}]`,h,errors,false);}); void lectureIds; });
}
function validateInstructor(value: unknown, errors: string[]): void {
  if (!record(value)) { errors.push("instructor must be an object"); return; }
  unknownFields(value,["id","displayRole","subjectScope","pedagogicalInstructions","allowedModes","fallbackLanguage","extensionMetadata"],"instructor",errors);
  for (const key of ["id","displayRole","subjectScope","fallbackLanguage"] as const) stringValue(value[key],`instructor.${key}`,errors);
  const instructions=arrayValue(value.pedagogicalInstructions,"instructor.pedagogicalInstructions",errors)??[]; if(instructions.some(item=>typeof item!=="string")) errors.push("instructor.pedagogicalInstructions must contain strings only");
  const modes=arrayValue(value.allowedModes,"instructor.allowedModes",errors)??[]; const seen=new Set<string>(); modes.forEach((mode,index)=>{if(typeof mode!=="string"||!INSTRUCTOR_MODES.has(mode))errors.push(`instructor.allowedModes[${index}] is not a canonical InstructorMode`);else if(seen.has(mode))errors.push(`instructor.allowedModes contains duplicate ${mode}`);else seen.add(mode);});
}
function validateAssets(value: unknown, errors: string[]): void { const rows=arrayValue(value,"assets",errors)??[]; if(rows.length>PACKAGE_LIMITS.maxAssets)errors.push("assets exceeds the collection limit"); rows.forEach((row,index)=>{if(!record(row)){errors.push(`assets[${index}] must be an object`);return;} unknownFields(row,["id","kind","label","mediaType","byteLength","extensionMetadata"],`assets[${index}]`,errors); stringValue(row.id,`assets[${index}].id`,errors); stringValue(row.label,`assets[${index}].label`,errors); stringValue(row.mediaType,`assets[${index}].mediaType`,errors); if(typeof row.byteLength!=="number"||row.byteLength<0)errors.push(`assets[${index}].byteLength must be a non-negative number`);}); }
function validateMigrations(value: unknown, errors: string[]): void { const rows=arrayValue(value,"migrations",errors)??[]; rows.forEach((row,index)=>{if(!record(row)){errors.push(`migrations[${index}] must be an object`);return;} unknownFields(row,["fromCourseVersion","toCourseVersion","strategy","notes","extensionMetadata"],`migrations[${index}]`,errors); for(const key of ["fromCourseVersion","toCourseVersion","notes"] as const)stringValue(row[key],`migrations[${index}].${key}`,errors); if(!["preserve","reset-required","manual-review"].includes(String(row.strategy)))errors.push(`migrations[${index}].strategy is unknown`);}); }
function validateAcademic(value: unknown,h:Hierarchy,manifest:CoursePackageManifest|undefined,errors:string[]):void {
  if(!record(value)){errors.push("academic must be an object");return;} unknownFields(value,["version","program","syllabus","units","readings","assignments","assessments","completionRequirements","policySemantics","completionPolicySemantics","assessmentPlanSemantics","extensionMetadata"],"academic",errors);
  if(record(value.program))unknownFields(value.program,["id","title","description","courseIds","status","extensionMetadata"],"academic.program",errors);
  if(record(value.syllabus))unknownFields(value.syllabus,["id","title","description","learningOutcomes","policies","prerequisites","capstoneAssessmentId","extensionMetadata"],"academic.syllabus",errors);
  const units=arrayValue(value.units,"academic.units",errors)??[]; units.forEach((row,i)=>{if(!record(row))return; unknownFields(row,["id","moduleId","title","description","learningObjectives","prerequisiteUnitIds","extensionMetadata"],`academic.units[${i}]`,errors); const id=stringValue(row.moduleId,`academic.units[${i}].moduleId`,errors);if(id&&!h.unitIds.has(id))errors.push(`academic.units[${i}].moduleId references an unknown unit`);});
  const readings=arrayValue(value.readings,"academic.readings",errors)??[]; readings.forEach((row,i)=>{if(record(row)){unknownFields(row,["id","title","body","source","unitId","lessonId","required","extensionMetadata"],`academic.readings[${i}]`,errors);checkLocation(row.source,`academic.readings[${i}].source`,h,errors,true);}});
  const assignments=arrayValue(value.assignments,"academic.assignments",errors)??[]; assignments.forEach((row,i)=>{if(record(row)){unknownFields(row,["id","title","instructions","source","unitId","lessonId","sourceActivityIds","required","extensionMetadata"],`academic.assignments[${i}]`,errors);checkLocation(row.source,`academic.assignments[${i}].source`,h,errors,true);}});
  const assessments=arrayValue(value.assessments,"academic.assessments",errors)??[]; assessments.forEach((row,i)=>validateAssessment(row,`academic.assessments[${i}]`,h,errors));
  for (const key of ["policySemantics","completionPolicySemantics","assessmentPlanSemantics"] as const) if (value[key] !== undefined && !record(value[key])) errors.push(`academic.${key} must be an object`);
  void manifest;
}
function validateLabs(value: unknown,h:Hierarchy,manifest:CoursePackageManifest|undefined,errors:string[]):void {
  if(!record(value)){errors.push("labs must be an object");return;} unknownFields(value,["version","runtimeVersion","courseId","labs","extensionMetadata"],"labs",errors);
  if(manifest&&value.courseId!==manifest.courseId)errors.push("labs.courseId must match manifest.courseId");
  const labs=arrayValue(value.labs,"labs.labs",errors)??[]; if(labs.length>PACKAGE_LIMITS.maxLabs)errors.push("labs exceeds the collection limit"); labs.forEach((lab,i)=>{if(!record(lab))return;unknownFields(lab,["id","title","purpose","unitId","sourceLocation","sourceLocations","learningObjective","estimatedMinutes","required","environment","initialState","actions","checks","steps","requiredStepIds","reflectionPrompts","instructorNote","extensionMetadata"],`labs.labs[${i}]`,errors); if(typeof lab.unitId==="string"&&!h.unitIds.has(lab.unitId))errors.push(`labs.labs[${i}].unitId references an unknown unit`); if(lab.sourceLocation!==undefined)checkLocation(lab.sourceLocation,`labs.labs[${i}].sourceLocation`,h,errors,true); if(Array.isArray(lab.sourceLocations))lab.sourceLocations.forEach((loc,j)=>checkLocation(loc,`labs.labs[${i}].sourceLocations[${j}]`,h,errors,true)); const actionIds=ids(Array.isArray(lab.actions)?lab.actions:[] ,`labs.labs[${i}].actions`,errors); const checkIds=ids(Array.isArray(lab.checks)?lab.checks:[] ,`labs.labs[${i}].checks`,errors); const stepIds=ids(Array.isArray(lab.steps)?lab.steps:[] ,`labs.labs[${i}].steps`,errors); (Array.isArray(lab.actions)?lab.actions:[]).forEach((action,j)=>{if(record(action)){unknownFields(action,["id","label","instruction","preconditions","effects","createsObservation","extensionMetadata"],`labs.labs[${i}].actions[${j}]`,errors);if(Array.isArray(action.effects))action.effects.forEach((effect,k)=>{if(record(effect)){unknownFields(effect,["key","operation","value","extensionMetadata"],`labs.labs[${i}].actions[${j}].effects[${k}]`,errors);if(!["set","increment","append"].includes(String(effect.operation)))errors.push(`labs.labs[${i}].actions[${j}].effects[${k}].operation is unknown`);}});}}); (Array.isArray(lab.checks)?lab.checks:[]).forEach((check,j)=>{if(record(check)){unknownFields(check,["id","title","description","required","conditions","sourceLocation","extensionMetadata"],`labs.labs[${i}].checks[${j}]`,errors);if(Array.isArray(check.conditions))check.conditions.forEach((condition,k)=>{if(record(condition)&&!LAB_OPERATORS.has(String(condition.operator)))errors.push(`labs.labs[${i}].checks[${j}].conditions[${k}].operator is unknown`);});}}); (Array.isArray(lab.steps)?lab.steps:[]).forEach((step,j)=>{if(record(step)){unknownFields(step,["id","number","title","kind","instruction","unitId","sourceLocation","required","actionIds","checkIds","observationPrompt","reflectionPrompt","formalActivityId","extensionMetadata"],`labs.labs[${i}].steps[${j}]`,errors);if(typeof step.kind!=="string"||!LAB_KINDS.has(step.kind))errors.push(`labs.labs[${i}].steps[${j}].kind is unknown`);if(Array.isArray(step.actionIds))step.actionIds.forEach((id,k)=>{if(!actionIds.has(id))errors.push(`labs.labs[${i}].steps[${j}].actionIds[${k}] references an unknown action`);});if(Array.isArray(step.checkIds))step.checkIds.forEach((id,k)=>{if(!checkIds.has(id))errors.push(`labs.labs[${i}].steps[${j}].checkIds[${k}] references an unknown check`);});if(step.sourceLocation!==undefined)checkLocation(step.sourceLocation,`labs.labs[${i}].steps[${j}].sourceLocation`,h,errors,false);if(step.kind==="formal-activity"&&typeof step.formalActivityId==="string"&&!h.activityIds.has(step.formalActivityId))errors.push(`labs.labs[${i}].steps[${j}].formalActivityId references an unknown activity`);}}); (Array.isArray(lab.requiredStepIds)?lab.requiredStepIds:[]).forEach((id,j)=>{if(!stepIds.has(id))errors.push(`labs.labs[${i}].requiredStepIds[${j}] references an unknown step`);}); });
  }
export function validateCoursePackage(input: unknown): PackageValidationReport {
  const errors:string[]=[]; const unsupported:PackageCapability[]=[]; let serializedBytes=0;
  if(!record(input)){return {errors:["package must be an object"],unsupportedCapabilities:[],serializedBytes:0};}
  unknownFields(input,["manifest","course","lectures","instructor","academic","readings","assignments","assessments","remediation","labs","assets","migrations","extensionMetadata"],"package",errors);
  try{serializedBytes=new TextEncoder().encode(stableStringify(input)).byteLength;if(serializedBytes>PACKAGE_LIMITS.maxBytes)errors.push("package exceeds the byte limit");}catch{errors.push("package could not be serialized");}
  scanForbidden(input,"package",errors);
  const manifest=validateManifest(input.manifest,errors,unsupported)?input.manifest:undefined;
  const hierarchy=validateCourse(input.course,errors);
  if(manifest&&record(input.course)&&input.course.id!==manifest.courseId)errors.push("course.id must match manifest.courseId");
  if(input.lectures!==undefined)validateLecture(input.lectures,hierarchy,errors);
  if(input.instructor!==undefined)validateInstructor(input.instructor,errors);
  if(input.academic!==undefined)validateAcademic(input.academic,hierarchy,manifest,errors);
  if(input.labs!==undefined)validateLabs(input.labs,hierarchy,manifest,errors);
  if(input.assets!==undefined)validateAssets(input.assets,errors);
  if(input.migrations!==undefined)validateMigrations(input.migrations,errors);
  const assessments = arrayValue(input.assessments, "package.assessments", errors, false) ?? [];
  assessments.forEach((row, index) => validateAssessment(row, `package.assessments[${index}]`, hierarchy, errors));
  for(const key of ["readings","assignments","remediation"] as const){const rows=arrayValue(input[key],`package.${key}`,errors,false)??[];rows.forEach((row,i)=>{if(record(row)){unknownFields(row,key==="readings"?["id","title","body","source","unitId","lessonId","required","extensionMetadata"]:key==="assignments"?["id","title","instructions","source","unitId","lessonId","sourceActivityIds","required","extensionMetadata"]:["id","title","instructions","source","unitId","lessonId","sourceActivityIds","extensionMetadata"],`package.${key}[${i}]`,errors);checkLocation(row.source,`package.${key}[${i}].source`,hierarchy,errors,true);}});}
  return {errors,unsupportedCapabilities:[...new Set(unsupported)],serializedBytes};
}
export function parseCoursePackage(text:string):ParsedCoursePackage{if(typeof text!=="string")return{report:{errors:["package text must be a string"],unsupportedCapabilities:[],serializedBytes:0}};if(new TextEncoder().encode(text).byteLength>PACKAGE_LIMITS.maxBytes)return{report:{errors:["package exceeds the byte limit"],unsupportedCapabilities:[],serializedBytes:0}};try{const value=JSON.parse(text) as unknown;const report=validateCoursePackage(value);return{document:report.errors.length?undefined:value as CoursePackageDocument,report};}catch{return{report:{errors:["package is not valid JSON"],unsupportedCapabilities:[],serializedBytes:0}};}}
export async function sha256CoursePackage(document:CoursePackageDocument):Promise<string>{const bytes=new TextEncoder().encode(serializeCoursePackage(document));const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");}
