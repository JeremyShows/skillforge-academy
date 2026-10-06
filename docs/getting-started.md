# Getting started with SkillForge Academy

A five-minute guide to installing SkillForge Academy and building a study routine
that actually moves your exam readiness. No account, no cloud — everything stays
on your computer.

> New here? The short version: **install → pick a track → read a lesson →
> practice it → check yourself with a mock → keep your recall deck clear.**

## 1. Install and first run

1. Download the latest Windows installer from the
   [releases page](https://github.com/JeremyShows/skillforge-academy/releases)
   (see the [README](../README.md#installer) for system requirements and
   checksum verification).
2. Run the `.exe`. Because the build is not yet code-signed, Windows SmartScreen
   may warn about an unrecognized publisher — choose **More info → Run anyway**.
3. Launch the app. It opens on the **Command Center**, your home base.

There is nothing to sign up for. Your name, progress, notes, and schedule are
stored locally and never leave the machine. SkillForge does not send telemetry.
If install, backups, or progress go wrong, use
[Support And Troubleshooting](support-troubleshooting.md). For a support ticket,
export a local diagnostic file from **Preferences → Diagnostics** — see
[Diagnostics And Error Reporting](diagnostics.md).

## 2. Choose your certification track

SkillForge ships three CompTIA tracks — **A+**, **Network+**, and **Security+** —
each with its own progress, streaks, and analytics. Use the **track switcher** at
the top of the sidebar to move between them.

![Switching certification tracks](screenshots/08-track-switcher.png)

Pick the certification you're studying for first. Everything else in the app —
lessons, practice, mock exams, flashcards, analytics — follows the track you have
selected. Switching tracks never mixes or resets another track's progress.

## 3. Use the Academy course runtime

The **Academy** view is the course library and launcher. Built-in certification
tracks and locally imported courses use the same declarative runtime. A course
card shows its version, declared package metadata, and local enrollment state;
opening a course creates or resumes its namespaced `CourseProgress` record.

To install a local course package:

1. Choose **Import Course Package** in the Academy header.
2. Select a `.skillforge-course` file.
3. Review the validation result and declared capabilities.
4. Select the new course in the installed-course list.

The package is validated before installation. It is data, not a plugin, and
cannot execute commands, network calls, or native code. Course packages do not
contain learner history; your progress remains in the local platform envelope.
The full contract is documented in [Course Package Format](COURSE-PACKAGE-FORMAT.md)
and [Course Distribution](COURSE-DISTRIBUTION.md).

### Classroom

Open **Classroom** to see the current authored resume point and lesson
activities. Activity completion and mastery are recorded by `CourseProgress`,
so the same evidence remains available when you leave and return to the course.
The interface distinguishes ordinary teaching activities from formal authored
activities and uses the appropriate response surface for each.

### Lecture

If a package includes a valid authored `lectures` catalog, the Lecture tab
presents its authored sequence. Guided practice, independent practice,
assessments, and remediation open through the shared authored activity surface.
A failed assessment enters only the exact authored remediation for the current
activity, then returns to the assessment for retry. A passing first attempt
skips remediation.

When all active required segments are complete, the view says **Lecture
complete** and no longer offers an advance button. Informational and interactive
segments retain their advance or response controls while the lecture is still
incomplete.

### Academic record and Labs

Packages may expose Lecture, Academic, or Labs when the corresponding authored
catalogs are present and validate. Academic status is derived from
CourseProgress; lab actions stay inside the bounded local lab state machine.

## 4. The daily study loop

A good session moves through four stages. You don't need all four every day, but
over a week you want to touch each one. In the sidebar, these sit under the
primary study destinations: **Learning Paths**, **Practice Lab**, **Mock Exam**,
and **Recall Deck**. PBQ Lab, Performance, Notes, and Preferences live under
**Tools**.

The **Command Center** highlights one next best domain drill — use that when you
are not sure where to start.

### Learn — read the lesson

Open **Learning Paths**. The curriculum is organized by exam domain and exam
objective, so you can study in focused blocks instead of scrolling endlessly.
Each domain shows its exam weight and how many lessons and objectives you've
completed.

![Learning Paths](screenshots/02-learning-paths.png)

Read a lesson, then use the knowledge checks at the bottom of the domain to jump
straight into practice.

### Practice — prove it

Open the **Practice Lab**, choose an exam (or "Mixed"), optionally a **domain
focus**, and a question count, then launch. From Command Center or Learning Paths
you can jump straight into a domain-scoped drill. Each original question gives
immediate feedback and a technician-focused explanation after you answer.

![Practice Lab](screenshots/03-practice-lab.png)

Questions come in several formats, including **multi-select** ("choose TWO/THREE")
items that mirror the real exam. When you see the *"Select N answers"* hint, the
options become checkboxes — pick exactly that many.

![Multi-select question](screenshots/07-multi-select.png)

### Test — sit a mock exam

When a domain feels solid, open **Mock Exam** for a full-length, timed,
domain-weighted simulation. The timer counts down and auto-submits at zero, and
there's no feedback until you finish — just like the real thing. You then get a
pass/fail result against that track's official pass line (A+ 75%, Network+ 80%,
Security+ 83%), a per-domain breakdown, and a full review. After the exam, use
**Drill {weakest domain}** to remediate immediately, or warm up beforehand in
**PBQ Lab** under Tools.

![Mock Exam](screenshots/04-mock-exam.png)

### Remember — clear your recall deck

Open the **Recall Deck** and rate each card **Again / Hard / Good / Easy**. An
SM-2 spaced-repetition scheduler decides when each card comes back, so difficult
material returns sooner and easy material spreads out.

![Recall Deck](screenshots/05-recall-deck.png)

## 5. Track your readiness

The **Command Center** and **Performance** views turn your activity into signal:
overall readiness, streaks, score trends, domain mastery, and an objective-level
coverage heatmap that shows exactly where to focus next.

![Command Center](screenshots/01-command-center.png)

The **objective coverage** heatmap (under **Performance**) is the fastest way to
spot weak spots — red and amber cells are objectives that still need work.

![Performance analytics](screenshots/06-performance.png)

## 6. Back up your progress

Because your data is local, **export a backup** before reinstalling or moving to
another computer. Open **Preferences → backup** and create a passphrase-protected
portable backup (AES-256-GCM encrypted). Import it on the new machine to restore
everything — progress, notes, bookmarks, settings, and your recall schedule.

## Handy extras

- **Ctrl + K** opens a command palette to search objectives, commands, ports,
  explanations, answers, and flashcards — and to jump to any view.
- **Bookmark** tricky questions while practicing to revisit them later.
- **Notes & Saves** is your private knowledge base for ports, commands,
  troubleshooting sequences, and mnemonics.
- Switch between **dark and light themes** in Preferences.

## A suggested first week

| Day | Focus |
| --- | --- |
| 1 | Pick your track. Read the first domain's lessons; do a 10-question Practice session. |
| 2–4 | One domain per day: read, practice, and rate any new recall cards. |
| 5 | Clear your recall deck; run a Practice session in "Mixed" mode. |
| 6 | Sit your first Mock Exam. Review every miss. |
| 7 | Drill your two weakest objectives from the Performance heatmap. |

Build knowledge. Practice judgment. Walk into the exam prepared.
