import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BookOpen, Check, ChevronRight, Download, FileUp, GraduationCap, MessageCircle, Play, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { ContentBundle } from "../content/validate";
import { applyAuthoredActivityResponse, createCourseProgress, createCourseRuntimeContext, deterministicInstructorFallback, isFormalActivity, type CourseProgress, type CourseProgressMap, type CourseRuntimeContext } from "./runtime";
import { AuthoredActivitySurface } from "./AuthoredActivitySurface";
import { CourseRegistry } from "./registry";
import type { CoursePackageDocument } from "./packageTypes";
import { emptyClassroomState } from "../classroom/types";
import { activeSegmentForProgress, planClassSession } from "../classroom/planner";
import { academicRecordSummary } from "../academic/progress";
import { emptyAcademicEngagementState } from "../academic/types";
import { advanceLectureSegment, createLectureRunState, currentLectureSegment, lectureCanClose, lectureCompletionLabel, segmentPresentationKind } from "../lecture/runtime";
import { applyLectureActivityResponse, LECTURE_ACTIVITY_RESOLUTION_ERROR, resolveLectureActivity } from "./lectureActivityBridge";
import { addLabNote, applyLabAction, completeLabRun, createLabRun, evaluateLabChecks, pauseLabRun, recordLabObservation, recordLabPrediction, recordLabReflection, resetLabRun, resumeLabRun, visitLabStep } from "../labs/runtime";
import type { LabRunState } from "../labs/types";
import { buildPublicPackages } from "./publicPackages";
import { courseProgressMapFromEnvelope, getPlatformLearnerEnvelopeStore, removeInstalledPackageIdentity, saveInstalledPackageIdentity } from "./persistence";

type PlatformScreen = "courses" | "classroom" | "lecture" | "academic" | "labs";
interface PlatformHubProps { content: ContentBundle; onOpenCertificationWorkspace: () => void; }
function progressFor(map: CourseProgressMap, context: CourseRuntimeContext): CourseProgress | undefined { return map[context.progressNamespace]; }
function lessonCount(context: CourseRuntimeContext): number { return context.course.modules.reduce((total, module) => total + module.lessons.length, 0); }
function activityDone(progress: CourseProgress | undefined, lessonId: string, activityId: string): boolean { return Boolean(progress?.lessonProgress[lessonId]?.completedActivityIds.includes(activityId)); }
function segmentText(segment: { authoredContent?: { kind: string; paragraphs?: string[]; textEquivalent?: string }; teacherCue?: string; prompt?: string }): string { return segment.authoredContent?.kind === "prose" ? segment.authoredContent.paragraphs?.join("\n\n") ?? segment.prompt ?? segment.teacherCue ?? "" : segment.authoredContent?.textEquivalent ?? segment.prompt ?? segment.teacherCue ?? ""; }

export default function PlatformHub({ content, onOpenCertificationWorkspace }: PlatformHubProps) {
  const envelopeStore = getPlatformLearnerEnvelopeStore();
  const envelopeSnapshot = useSyncExternalStore(envelopeStore.subscribe, envelopeStore.getSnapshot, envelopeStore.getServerSnapshot);
  const [registryVersion, setRegistryVersion] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState(() => buildPublicPackages(content)[0]?.manifest.packageId ?? "");
  const [screen, setScreen] = useState<PlatformScreen>("courses");
  const [notice, setNotice] = useState("");
  const [lectureRun, setLectureRun] = useState<ReturnType<typeof createLectureRunState>>();
  const [lectureResponse, setLectureResponse] = useState("");
  const [labRun, setLabRun] = useState<LabRunState>();
  const [labText, setLabText] = useState("");
  const [activeActivityId, setActiveActivityId] = useState<string>();
  const [activityResponse, setActivityResponse] = useState("");
  const packageInput = useRef<HTMLInputElement>(null);
  const registry = useMemo(() => new CourseRegistry(buildPublicPackages(content), undefined, change => {
    const mutation = change.action === "remove"
      ? removeInstalledPackageIdentity(change.packageId)
      : change.courseId && change.courseVersion && change.contentVersion
        ? saveInstalledPackageIdentity({ packageId: change.packageId, courseId: change.courseId, courseVersion: change.courseVersion, contentVersion: change.contentVersion, packageVersion: change.packageVersion })
        : undefined;
    if (mutation) void mutation.then(result => {
      if (result.status === "failed") setNotice("Course package state could not be saved. " + (result.error ?? ""));
    });
  }), [content]);
  void registryVersion;

  useEffect(() => { void envelopeStore.hydrate().catch(() => undefined); }, [envelopeStore]);
  const progressMap = envelopeSnapshot.envelope ? courseProgressMapFromEnvelope(envelopeSnapshot.envelope) : {};
  const selected = registry.packageById(selectedPackageId) ?? registry.packages()[0];
  const context = selected ? createCourseRuntimeContext(selected) : undefined;
  const progress = context ? progressFor(progressMap, context) : undefined;
  const plan = context && progress ? planClassSession(context.course, progress, emptyClassroomState()) : undefined;
  const activeSegment = context && progress && plan ? activeSegmentForProgress(context.course, plan, progress) : undefined;
  const academicRecord = context?.academicCatalog && progress ? academicRecordSummary(context.academicCatalog, context.course, progress, emptyAcademicEngagementState()) : undefined;
  const lecture = context?.lectures?.lectures[0];
  const lab = context?.labs?.labs[0];

  const choosePackage = (document: CoursePackageDocument) => {
    setSelectedPackageId(document.manifest.packageId); setScreen("courses"); setLectureRun(undefined); setLectureResponse(""); setLabRun(undefined); setActivityResponse(""); setNotice("");
  };
  const mutateCourseProgress = async (update: (current: CourseProgress) => CourseProgress) => {
    if (!context) return undefined;
    const namespace = context.progressNamespace;
    const result = await envelopeStore.mutate(envelope => {
      const current = courseProgressMapFromEnvelope(envelope)[namespace] ?? createCourseProgress(context);
      const next = update(current);
      return {
        ...envelope,
        courses: {
          ...envelope.courses,
          [namespace]: { ...envelope.courses[namespace], progress: next }
        }
      };
    });
    if (result.status === "failed") {
      setNotice("Learner progress is in this session but could not be saved. The last saved copy remains unchanged.");
    }
    return result;
  };
  const enroll = async () => {
    if (!context) return;
    const result = await mutateCourseProgress(current => current);
    if (result?.status === "persisted") setNotice(context.course.title + " is enrolled in the local course record.");
  };
  const openCourse = async () => {
    if (!context) return;
    const result = await mutateCourseProgress(current => current);
    if (result?.status === "persisted") { setScreen("classroom"); setNotice(""); }
  };
  const submitActivity = async (location: { moduleId: string; lessonId: string; activityId: string }, response = activityResponse) => {
    if (!context) return;
    const result = await mutateCourseProgress(current => applyAuthoredActivityResponse(context, current, location, response));
    if (result?.status === "persisted") {
      setNotice("Authored response evaluated and saved by the course runtime.");
      setActivityResponse("");
    }
  };
  const activeActivity = context?.course.modules.flatMap(module => module.lessons).flatMap(lesson => lesson.activities).find(activity => activity.id === activeActivityId);
  const activeActivityLocation = context && activeActivity ? context.course.modules.flatMap(module => module.lessons.map(lesson => ({ module, lesson }))).find(({ lesson }) => lesson.activities.some(activity => activity.id === activeActivity.id)) : undefined;
  const importPackage = async (file: File) => {
    if (envelopeSnapshot.phase !== "ready") return;
    const result = registry.install(await file.text());
    if (!result.installed) { setNotice(`Course package rejected. ${result.unsupportedCapabilities.length ? `Unsupported capabilities: ${result.unsupportedCapabilities.join(", ")}` : result.errors.join("; ") || "Validation failed."}`); return; }
    setRegistryVersion(value => value + 1); if (result.package) choosePackage(result.package);
    setNotice(result.updated ? "Course package updated; learner state remains namespaced." : "Course package installed locally.");
  };
  const exportSelected = () => {
    if (!selected) return; const serialized = registry.export(selected.manifest.packageId); if (!serialized) return;
    const href = URL.createObjectURL(new Blob([serialized], { type: "application/json" })); const link = document.createElement("a"); link.href = href; link.download = `${selected.manifest.packageId}.skillforge-course`; link.click(); URL.revokeObjectURL(href); setNotice("Declarative course package exported locally.");
  };
  const startLecture = () => { if (lecture) { setLectureRun(createLectureRunState(lecture)); setLectureResponse(""); setActivityResponse(""); } };
  const advanceLecture = () => { if (lecture && lectureRun && context) { const segment = currentLectureSegment(lecture, lectureRun); const response = segment.expectedInteraction && segment.expectedInteraction !== "none" && lectureResponse.trim() ? { text: lectureResponse.trim(), kind: segment.expectedInteraction === "prediction" ? "prediction" as const : "question" as const } : undefined; setLectureRun(advanceLectureSegment(lecture, lectureRun, progress ?? createCourseProgress(context), response)); setLectureResponse(""); } };
  const submitLectureActivity = async () => {
    if (!context || !lecture || !lectureRun) return;
    const segment = currentLectureSegment(lecture, lectureRun);
    const appliedResult: { value: ReturnType<typeof applyLectureActivityResponse> } = { value: undefined };
    const result = await mutateCourseProgress(current => {
      appliedResult.value = applyLectureActivityResponse(context, current, lecture, lectureRun, segment, activityResponse);
      return appliedResult.value?.progress ?? current;
    });
    if (!appliedResult.value) { setNotice(LECTURE_ACTIVITY_RESOLUTION_ERROR); return; }
    const applied = appliedResult.value;
    if (result?.status === "persisted") {
      setLectureRun(applied.run);
      setActivityResponse("");
      setNotice(applied.outcome.passed ? "Lecture activity completed and saved through CourseProgress." : applied.outcome.assessment?.feedback ?? applied.outcome.note ?? "The authored response did not satisfy this activity.");
    }
  };
  const startLab = () => { if (lab) { setLabRun(createLabRun(lab)); setLabText(""); } };
  const runLabAction = (actionId: string) => { if (lab && labRun) setLabRun(applyLabAction(lab, labRun, labRun.currentStepId, actionId, new Date().toISOString())); };
  const evaluateLab = () => { if (lab && labRun) setLabRun(completeLabRun(lab, evaluateLabChecks(lab, labRun, new Date().toISOString()), new Date().toISOString())); };
  const advanceLabStep = () => { if (!lab || !labRun) return; const current = lab.steps.find(step => step.id === labRun.currentStepId); const next = current ? lab.steps.find(step => step.number > current.number) : undefined; if (next) setLabRun(visitLabStep(lab, labRun, next.id, new Date().toISOString())); };
  const recordLabText = () => { if (!lab || !labRun) return; const current = lab.steps.find(step => step.id === labRun.currentStepId); if (!current || !labText.trim()) return; const now = new Date().toISOString(); if (current.kind === "prediction") setLabRun(recordLabPrediction(lab, labRun, current.id, labText, now)); else if (current.kind === "reflection") setLabRun(recordLabReflection(labRun, current.id, labText, now)); else if (current.kind === "observation") setLabRun(recordLabObservation(labRun, "learner", current.title, labText, now)); else setLabRun(addLabNote(labRun, labText, now)); setLabText(""); };

  return <div className="platform-shell">
    <header className="platform-header"><div className="platform-brand"><span className="platform-mark"><Sparkles /></span><div><strong>SkillForge Academy</strong><small>One learner runtime · declarative courses</small></div></div><div className="platform-header-actions"><button className="platform-secondary" onClick={onOpenCertificationWorkspace}>Open certification study workspace</button><label className="platform-import"><Upload /> Import Course Package<input ref={packageInput} type="file" accept=".skillforge-course,application/json" disabled={envelopeSnapshot.phase !== "ready"} onChange={event => { const file = event.target.files?.[0]; if (file) void importPackage(file); event.currentTarget.value = ""; }} /></label></div></header>
    <div className="platform-layout">
      <aside className="platform-sidebar" aria-label="Installed courses"><div className="platform-sidebar-heading"><span>INSTALLED COURSES</span><span>{registry.packages().length}</span></div>{registry.packages().map(document => { const itemContext = createCourseRuntimeContext(document); const itemProgress = progressFor(progressMap, itemContext); return <button key={document.manifest.packageId} className={`platform-course-card ${selected?.manifest.packageId === document.manifest.packageId ? "selected" : ""}`} onClick={() => choosePackage(document)}><span className="platform-course-icon"><GraduationCap /></span><span><strong>{document.manifest.title}</strong><small>{document.manifest.packageVersion} · {itemProgress ? `${itemProgress.completedLessonIds.length}/${lessonCount(itemContext)} activities` : "Not enrolled"}</small></span><ChevronRight /></button>; })}<div className="platform-sidebar-note"><ShieldCheck /><span>Packages are validated data. They cannot execute code, commands, network calls, or native plugins.</span></div></aside>
      <main className="platform-main">{envelopeSnapshot.phase !== "ready" ? <section className="platform-content" aria-live="polite" aria-busy={envelopeSnapshot.phase === "hydrating" || envelopeSnapshot.phase === "idle"}>
          <span className="platform-eyebrow">LOCAL LEARNER DATA</span>
          <h1>{envelopeSnapshot.phase === "failed" ? "Course data could not be loaded" : "Preparing your course workspace"}</h1>
          <p>{envelopeSnapshot.phase === "failed" ? "Your saved course data was not changed. Retry loading before continuing." : "Loading your saved course progress before enabling learner actions."}</p>
          {envelopeSnapshot.phase === "failed" && <button className="platform-primary" onClick={() => { void envelopeStore.hydrate().catch(() => undefined); }}>Retry loading</button>}
        </section> : selected && context ? <>
        {envelopeSnapshot.recovered && <div className="platform-notice" role="status">Saved course data was recovered from its backup copy.</div>}
        {envelopeSnapshot.durability === "pending" && <div className="platform-notice" role="status">Saving learner progress…</div>}
        {envelopeSnapshot.durability === "failed" && <div className="platform-notice" role="alert">Learner progress is in this session but could not be saved. The last saved copy remains unchanged. <button className="platform-secondary" onClick={() => { void envelopeStore.retryPending().then(result => { if (result.status === "persisted") setNotice("Learner progress saved."); }); }}>Retry save</button></div>}
        <nav className="platform-tabs" aria-label="Course runtime navigation"><button className={screen === "courses" ? "active" : ""} onClick={() => setScreen("courses")}>Academy</button><button className={screen === "classroom" ? "active" : ""} onClick={() => setScreen("classroom")}>Classroom</button>{context.lectures && <button className={screen === "lecture" ? "active" : ""} onClick={() => setScreen("lecture")}>Lecture</button>}{context.package.academic && <button className={screen === "academic" ? "active" : ""} onClick={() => setScreen("academic")}>Academic record</button>}{context.labs && <button className={screen === "labs" ? "active" : ""} onClick={() => setScreen("labs")}>Labs</button>}</nav>
        {notice && <div className="platform-notice" role="status"><Check /> {notice}</div>}
        {screen === "courses" && <section className="platform-hero"><span className="platform-eyebrow">ACADEMY · COURSE LIBRARY / LAUNCHER</span><h1>{context.course.title}</h1><p>{context.course.description}</p><div className="platform-meta-row"><span>Version {context.package.manifest.courseVersion}</span><span>{context.package.manifest.publisher ?? "Course Author"}</span><span>{context.course.modules.length} units</span><span>{lessonCount(context)} lessons</span></div><div className="platform-action-row"><button className="platform-primary" onClick={openCourse}><Play /> {progress ? "Continue course" : "Enroll and open"}</button><button className="platform-secondary" onClick={enroll}>Enroll</button><button className="platform-secondary" onClick={exportSelected}><Download /> Export package</button></div><div className="platform-capabilities"><strong>Authored capabilities</strong>{context.capabilities.map(capability => <span key={capability}>{capability.replaceAll("-", " ")}</span>)}</div><div className="platform-grid"><div className="platform-panel"><BookOpen /><div><h2>Generic classroom runtime</h2><p>Class planning and the authoritative CourseProgress activity flow are selected for this course.</p></div></div><div className="platform-panel"><MessageCircle /><div><h2>Bounded instructor</h2><p>Provider-neutral fallback stays within authored material and cannot change progress.</p></div></div></div></section>}
        {screen === "classroom" && <section className="platform-content"><span className="platform-eyebrow">CLASSROOM · COURSEPROGRESS AUTHORITY</span><h1>{context.course.title}</h1><p className="platform-lede">{plan?.openingBrief ?? "Enroll to create a classroom plan."}</p>{activeSegment && <div className="platform-notice" role="status">Resume point: {activeSegment.title}</div>}{activeActivity && activeActivityLocation && <AuthoredActivitySurface activity={activeActivity} response={activityResponse} onResponseChange={setActivityResponse} onSubmit={() => submitActivity({ moduleId: activeActivityLocation.module.id, lessonId: activeActivityLocation.lesson.id, activityId: activeActivity.id })} onClose={() => setActiveActivityId(undefined)} />}{context.course.modules.map(module => <article className="platform-unit" key={module.id}><div><span className="platform-unit-label">UNIT</span><h2>{module.title}</h2><p>{module.summary}</p></div><div className="platform-lesson-list">{module.lessons.map(lesson => <div className="platform-lesson" key={lesson.id}><span><BookOpen /></span><div><strong>{lesson.title}</strong><small>{lesson.summary}</small><small>{lesson.activities.length} authored activities</small></div><div className="platform-action-row">{lesson.activities.map(activity => <button key={activity.id} className={activityDone(progress, lesson.id, activity.id) ? "platform-secondary" : "platform-primary"} onClick={() => { setActiveActivityId(activity.id); setActivityResponse(""); }}>{activityDone(progress, lesson.id, activity.id) ? envelopeSnapshot.durability === "persisted" ? "Evidence saved" : "Evidence in session" : isFormalActivity(activity) ? "Open formal activity" : "Open activity"}</button>)}</div></div>)}</div></article>)}</section>}
        {screen === "lecture" && lecture && <section className="platform-content"><span className="platform-eyebrow">LECTURE DELIVERY · AUTHORED SEQUENCE</span><h1>{lecture.title}</h1>{!lectureRun ? <button className="platform-primary" onClick={startLecture}><Play /> Start lecture</button> : (() => { const segment = currentLectureSegment(lecture, lectureRun); const presentation = segmentPresentationKind(segment); const resolved = presentation === "activity" && context ? resolveLectureActivity(context, segment) : undefined; const progressForLecture = progress ?? createCourseProgress(context); const lectureComplete = lectureCanClose(lecture, lectureRun, progressForLecture); return <article className="platform-lecture"><div className="platform-lecture-progress">SEGMENT {lecture.segments.findIndex(item => item.id === lectureRun.currentSegmentId) + 1} OF {lecture.segments.length}</div>{lectureComplete ? <div className="platform-notice" role="status">Lecture complete</div> : <div className="platform-lecture-progress">{lectureCompletionLabel(lecture, lectureRun, progressForLecture)}</div>}<h2>{segment.title}</h2>{presentation !== "activity" && <p>{segmentText(segment)}</p>}{!lectureComplete && presentation === "interaction" && segment.expectedInteraction && segment.expectedInteraction !== "none" && <><p><strong>Expected interaction:</strong> {segment.expectedInteraction}</p><textarea aria-label="Lecture interaction response" value={lectureResponse} onChange={event => setLectureResponse(event.target.value)} placeholder="Respond to the authored lecture prompt…" /></>}{!lectureComplete && presentation === "activity" && (resolved ? <AuthoredActivitySurface activity={resolved.activity} response={activityResponse} onResponseChange={setActivityResponse} onSubmit={submitLectureActivity} submitLabel="Complete lecture activity" contextLabel="This authored activity is completed through the course runtime." /> : <div className="platform-notice" role="alert">{LECTURE_ACTIVITY_RESOLUTION_ERROR}</div>)}{!lectureComplete && presentation !== "activity" && <button className="platform-primary" onClick={advanceLecture}>Advance authored segment <ChevronRight /></button>}<button className="platform-secondary" onClick={() => setNotice(deterministicInstructorFallback(context, "TEACH", "Explain this lecture segment").message)}><MessageCircle /> Ask deterministic instructor</button></article>; })()}</section>}
        {screen === "academic" && context.academicCatalog?.courses[0] && <section className="platform-content"><span className="platform-eyebrow">ACADEMIC RECORD · AUTHORITATIVE COURSEPROGRESS DERIVATION</span><h1>{context.academicCatalog.courses[0].syllabus.title}</h1><p>{context.academicCatalog.courses[0].syllabus.courseDescription}</p>{academicRecord && <div className="platform-notice" role="status">Academic Record: {academicRecord.assignments.filter(item => item.status === "complete").length}/{academicRecord.assignments.length} assignments complete · {academicRecord.assessments.filter(item => item.status !== "not-started").length}/{academicRecord.assessments.length} assessments active</div>}<h2>Syllabus policies</h2><p>Self-paced authored academic work follows the course’s declared completion and assistance policies.</p><h2>Readings</h2>{context.academicCatalog.courses[0].readings.map(reading => <article className="platform-panel" key={reading.id}><BookOpen /><div><h3>{reading.title}</h3><p>{reading.description}</p></div></article>)}{academicRecord && <><h2>Assignments and assessments</h2>{academicRecord.assignments.map(item => <article className="platform-panel" key={item.definition.id}><div><h3>{item.definition.title}</h3><p>Status: {item.status}</p></div></article>)}{academicRecord.assessments.map(item => <article className="platform-panel" key={item.definition.id}><div><h3>{item.definition.title}</h3><p>Status: {item.status} · Evidence: {item.evidence}</p></div></article>)}</>}</section>}
        {screen === "labs" && lab && <section className="platform-content"><span className="platform-eyebrow">LABS · BOUNDED LOCAL RUNTIME</span><h1>{lab.title}</h1><p>{lab.purpose}</p>{!labRun ? <button className="platform-primary" onClick={startLab}><Play /> Start lab</button> : <article className="platform-lab"><p>Current step: <strong>{lab.steps.find(step => step.id === labRun.currentStepId)?.title ?? "Complete"}</strong></p><p>Status: <strong>{labRun.status}</strong></p><code>{JSON.stringify(labRun.state)}</code>{["prediction", "observation", "reflection"].includes(lab.steps.find(step => step.id === labRun.currentStepId)?.kind ?? "") && <div className="platform-action-row"><input aria-label="Lab response" value={labText} onChange={event => setLabText(event.target.value)} placeholder="Record the authored response" /><button className="platform-primary" onClick={recordLabText}>Record authored response</button></div>}{lab.steps.find(step => step.id === labRun.currentStepId)?.kind === "action" && <div className="platform-action-row">{lab.actions.map(action => <button className="platform-primary" key={action.id} onClick={() => runLabAction(action.id)}>{action.label}</button>)}</div>}{lab.steps.find(step => step.id === labRun.currentStepId)?.kind === "check" && <button className="platform-secondary" onClick={evaluateLab}>Evaluate authored checks</button>}<div className="platform-action-row"><button className="platform-secondary" onClick={advanceLabStep}>Visit next authored step</button><button className="platform-secondary" onClick={() => setLabRun(labRun.status === "paused" ? resumeLabRun(labRun, new Date().toISOString()) : pauseLabRun(labRun, new Date().toISOString()))}>{labRun.status === "paused" ? "Resume lab" : "Pause lab"}</button><button className="platform-secondary" onClick={() => setLabRun(resetLabRun(lab, labRun, new Date().toISOString()))}>Reset lab</button></div></article>}</section>}
      </> : <section className="platform-content"><h1>No course packages installed</h1><p>Import a declarative package to continue.</p><label className="platform-primary"><FileUp /> Choose package<input type="file" accept=".skillforge-course,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void importPackage(file); }} /></label></section>}</main>
    </div>
  </div>;
}
