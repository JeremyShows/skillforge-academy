import { useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronRight, Download, FileUp, GraduationCap, Layers, MessageCircle, Play, RefreshCw, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { ContentBundle } from "../content/validate";
import { buildPublicPackages } from "./publicPackages";
import { CourseRegistry } from "./registry";
import { applyLocalLabAction, completeLesson, createCourseProgress, createCourseRuntimeContext, createLocalLabRun, deterministicInstructorFallback, enrollCourse, evaluateLocalLabChecks, loadCourseProgress, recordAssessmentAttempt, saveCourseProgress, type CourseProgress, type CourseProgressMap, type CourseRuntimeContext, type LocalLabRun } from "./runtime";
import type { CoursePackageDocument } from "./packageTypes";

type PlatformScreen = "courses" | "classroom" | "lecture" | "assignments" | "assessments" | "labs";

interface PlatformHubProps {
  content: ContentBundle;
  onOpenCertificationWorkspace: () => void;
}

function progressFor(map: CourseProgressMap, context: CourseRuntimeContext): CourseProgress | undefined { return map[context.progressNamespace]; }
function lessonCount(context: CourseRuntimeContext): number { return context.course.units.reduce((total, unit) => total + unit.lessons.length, 0); }
function label(value: string): string { return value.replaceAll("-", " "); }

export default function PlatformHub({ content, onOpenCertificationWorkspace }: PlatformHubProps) {
  const registry = useMemo(() => new CourseRegistry(buildPublicPackages(content)), [content]);
  const [registryVersion, setRegistryVersion] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState(() => buildPublicPackages(content)[0]?.manifest.packageId ?? "");
  const [screen, setScreen] = useState<PlatformScreen>("courses");
  const [progressMap, setProgressMap] = useState<CourseProgressMap>(() => loadCourseProgress());
  const [notice, setNotice] = useState("");
  const [lectureIndex, setLectureIndex] = useState(0);
  const [labRun, setLabRun] = useState<LocalLabRun>();
  const packageInput = useRef<HTMLInputElement>(null);
  void registryVersion;

  const selected = registry.packageById(selectedPackageId) ?? registry.packages()[0];
  const context = selected ? createCourseRuntimeContext(selected) : undefined;
  const progress = context ? progressFor(progressMap, context) : undefined;
  const lecture = context?.lectures?.lectures[0];
  const lab = context?.labs?.labs[0];

  const choosePackage = (document: CoursePackageDocument) => {
    setSelectedPackageId(document.manifest.packageId);
    setScreen("courses");
    setLectureIndex(0);
    setLabRun(undefined);
    setNotice("");
  };
  const enroll = () => {
    if (!context) return;
    const next = enrollCourse(progressMap, context);
    setProgressMap(next);
    saveCourseProgress(next);
    setNotice(`${context.course.title} is ready in your local course record.`);
  };
  const openCourse = () => {
    if (!context) return;
    const next = enrollCourse(progressMap, context);
    setProgressMap(next);
    saveCourseProgress(next);
    setScreen("classroom");
    setNotice("");
  };
  const complete = (unitId: string, lessonId: string) => {
    if (!context) return;
    const existing = progress ?? createCourseProgress(context);
    const nextProgress = completeLesson(existing, lessonId, unitId);
    const next = { ...progressMap, [context.progressNamespace]: nextProgress };
    setProgressMap(next);
    saveCourseProgress(next);
    setNotice("Lesson completion saved to this course namespace.");
  };
  const importPackage = async (file: File) => {
    const result = registry.install(await file.text());
    if (!result.installed) {
      const detail = result.unsupportedCapabilities.length ? `Unsupported capabilities: ${result.unsupportedCapabilities.join(", ")}` : result.errors.join("; ");
      setNotice(`Course package rejected. ${detail || "Validation failed."}`);
      return;
    }
    setRegistryVersion(value => value + 1);
    if (result.package) choosePackage(result.package);
    setNotice(result.updated ? "Course package updated; existing learner state was preserved." : "Course package installed locally.");
  };
  const exportSelected = () => {
    if (!selected) return;
    const serialized = registry.export(selected.manifest.packageId);
    if (!serialized) return;
    const href = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${selected.manifest.packageId}.skillforge-course`;
    link.click();
    URL.revokeObjectURL(href);
    setNotice("Declarative course package exported locally.");
  };
  const beginLab = () => { if (lab) setLabRun(createLocalLabRun(lab)); };
  const runLabAction = (actionId: string) => { if (lab && labRun) setLabRun(applyLocalLabAction(lab, labRun, labRun.currentStepId, actionId)); };

  return <div className="platform-shell">
    <header className="platform-header"><div className="platform-brand"><span className="platform-mark"><Sparkles /></span><div><strong>SkillForge Academy</strong><small>One learner runtime · declarative courses</small></div></div><div className="platform-header-actions"><button className="platform-secondary" onClick={onOpenCertificationWorkspace}>Open certification study workspace</button><label className="platform-import"><Upload /> Import Course Package<input ref={packageInput} type="file" accept=".skillforge-course,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void importPackage(file); event.currentTarget.value = ""; }} /></label></div></header>
    <div className="platform-layout">
      <aside className="platform-sidebar" aria-label="Installed courses"><div className="platform-sidebar-heading"><span>INSTALLED COURSES</span><span>{registry.packages().length}</span></div>{registry.packages().map(document => { const itemContext = createCourseRuntimeContext(document); const itemProgress = progressFor(progressMap, itemContext); return <button key={document.manifest.packageId} className={`platform-course-card ${selected?.manifest.packageId === document.manifest.packageId ? "selected" : ""}`} onClick={() => choosePackage(document)}><span className="platform-course-icon"><GraduationCap /></span><span><strong>{document.manifest.title}</strong><small>{document.manifest.packageVersion} · {itemProgress ? `${itemProgress.completedLessonIds.length}/${lessonCount(itemContext)} lessons` : "Not enrolled"}</small></span><ChevronRight /></button>; })}<div className="platform-sidebar-note"><ShieldCheck /><span>Packages are validated data. They cannot execute code, commands, network calls, or native plugins.</span></div></aside>
      <main className="platform-main">{selected && context ? <>
        <nav className="platform-tabs" aria-label="Course runtime navigation"><button className={screen === "courses" ? "active" : ""} onClick={() => setScreen("courses")}>Academy</button><button className={screen === "classroom" ? "active" : ""} onClick={() => setScreen("classroom")}>Classroom</button><button className={screen === "lecture" ? "active" : ""} onClick={() => setScreen("lecture")} disabled={!context.lectures}>Lecture</button><button className={screen === "assignments" ? "active" : ""} onClick={() => setScreen("assignments")} disabled={!context.package.assignments?.length}>Assignments</button><button className={screen === "assessments" ? "active" : ""} onClick={() => setScreen("assessments")} disabled={!context.package.assessments?.length}>Assessments</button><button className={screen === "labs" ? "active" : ""} onClick={() => setScreen("labs")} disabled={!context.labs}>Labs</button></nav>
        {notice && <div className="platform-notice" role="status"><Check /> {notice}</div>}
        {screen === "courses" && <section className="platform-hero"><span className="platform-eyebrow">ACADEMY · INSTALLED COURSE</span><h1>{context.course.title}</h1><p>{context.course.description}</p><div className="platform-meta-row"><span>Version {context.package.manifest.courseVersion}</span><span>{context.package.manifest.publisher ?? "Course Author"}</span><span>{context.course.units.length} units</span><span>{lessonCount(context)} lessons</span></div><div className="platform-action-row"><button className="platform-primary" onClick={openCourse}><Play /> {progress ? "Continue course" : "Enroll and open"}</button><button className="platform-secondary" onClick={enroll}>Enroll</button><button className="platform-secondary" onClick={exportSelected}><Download /> Export package</button></div><div className="platform-capabilities"><strong>Capabilities</strong>{context.capabilities.map(capability => <span key={capability}>{label(capability)}</span>)}</div><div className="platform-grid"><div className="platform-panel"><BookOpen /><div><h2>Course runtime</h2><p>Units, lessons, readings, assessments, and progress use the same declarative course context.</p></div></div><div className="platform-panel"><MessageCircle /><div><h2>Deterministic instructor</h2><p>Provider-neutral fallback stays bounded to authored course material and cannot change progress.</p></div></div></div></section>}
        {screen === "classroom" && <section className="platform-content"><span className="platform-eyebrow">CLASSROOM · COURSE PROGRESS AUTHORITY</span><h1>{context.course.title}</h1><p className="platform-lede">Complete authored lessons in order that makes sense for you. Academic progress is stored under <code>{context.progressNamespace}</code>.</p>{context.course.units.map(unit => <article className="platform-unit" key={unit.id}><div><span className="platform-unit-label">UNIT</span><h2>{unit.title}</h2><p>{unit.description}</p></div><div className="platform-lesson-list">{unit.lessons.slice(0, 6).map(lesson => { const done = progress?.completedLessonIds.includes(lesson.id); return <div className={`platform-lesson ${done ? "done" : ""}`} key={lesson.id}><span>{done ? <Check /> : <BookOpen />}</span><div><strong>{lesson.title}</strong><small>{lesson.summary}</small></div><button onClick={() => complete(unit.id, lesson.id)} disabled={done}>{done ? "Complete" : "Mark complete"}</button></div>; })}{unit.lessons.length > 6 && <small className="platform-muted">{unit.lessons.length - 6} additional authored lessons remain available through the certification workspace.</small>}</div></article>)}</section>}
        {screen === "lecture" && lecture && <section className="platform-content"><span className="platform-eyebrow">LECTURE DELIVERY · AUTHORED SEQUENCE</span><h1>{lecture.title}</h1><p className="platform-lede">Lecture segments are declarative content. The runtime supplies sequence, focus, notes, and deterministic fallback behavior.</p><article className="platform-lecture"><div className="platform-lecture-progress">SEGMENT {lectureIndex + 1} OF {lecture.segments.length}</div><h2>{lecture.segments[lectureIndex]?.title}</h2><p>{lecture.segments[lectureIndex]?.body}</p><div className="platform-action-row"><button className="platform-primary" onClick={() => setLectureIndex(value => Math.min(value + 1, lecture.segments.length - 1))} disabled={lectureIndex >= lecture.segments.length - 1}>Next segment <ChevronRight /></button><button className="platform-secondary" onClick={() => setNotice(deterministicInstructorFallback(context, "TEACH", "Explain this lecture segment").message)}><MessageCircle /> Ask deterministic instructor</button></div></article></section>}
        {screen === "assignments" && <section className="platform-content"><span className="platform-eyebrow">ASSIGNMENTS · APPLIED PRACTICE</span><h1>Assignments</h1>{(context.package.assignments ?? []).map(assignment => <article className="platform-panel platform-record" key={assignment.id}><Layers /><div><h2>{assignment.title}</h2><p>{assignment.instructions}</p><small>Source unit: {assignment.source.unitId}</small></div></article>)}</section>}
        {screen === "assessments" && <section className="platform-content"><span className="platform-eyebrow">ASSESSMENTS · READINESS EVIDENCE</span><h1>Assessments</h1><p className="platform-lede">Assessments produce learner evidence. Only the academic progress authority can record course progress; packages cannot grant mastery.</p>{(context.package.assessments ?? []).map(assessment => <article className="platform-panel platform-record" key={assessment.id}><ShieldCheck /><div><h2>{assessment.title}</h2><p>{assessment.instructions}</p><button className="platform-secondary" onClick={() => { const existing = progress ?? createCourseProgress(context); const nextProgress = recordAssessmentAttempt(existing); const next = { ...progressMap, [context.progressNamespace]: nextProgress }; setProgressMap(next); saveCourseProgress(next); setNotice("Assessment attempt recorded in this course namespace."); }}>Record practice attempt</button></div></article>)}</section>}
        {screen === "labs" && lab && <section className="platform-content"><span className="platform-eyebrow">LABS · DETERMINISTIC LOCAL RUNTIME</span><h1>{lab.title}</h1><p className="platform-lede">This authored lab runs in a bounded state machine. It has no shell, process, filesystem, network, or provider authority.</p>{!labRun ? <button className="platform-primary" onClick={beginLab}><Play /> Start lab</button> : <article className="platform-lab"><div className="platform-lab-state"><span>Current step</span><strong>{lab.steps.find(step => step.id === labRun.currentStepId)?.title ?? "Complete"}</strong><span>State</span><code>{JSON.stringify(labRun.state)}</code></div>{lab.steps.find(step => step.id === labRun.currentStepId)?.kind === "action" && <div className="platform-action-row">{lab.actions.map(action => <button className="platform-primary" key={action.id} onClick={() => runLabAction(action.id)}>{action.label}</button>)}</div>}{labRun.currentStepId === lab.steps[lab.steps.length - 1]?.id && <button className="platform-secondary" onClick={() => setNotice(evaluateLocalLabChecks(lab, labRun) ? "Deterministic lab checks passed." : "Deterministic lab checks are not yet satisfied.")}><RefreshCw /> Evaluate authored checks</button>}</article>}</section>}
      </> : <section className="platform-content"><h1>No course packages installed</h1><p>Import a declarative `.skillforge-course` package to continue.</p><label className="platform-primary"><FileUp /> Choose package<input type="file" accept=".skillforge-course,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void importPackage(file); }} /></label></section>}</main>
    </div>
  </div>;
}
