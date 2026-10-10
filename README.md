# SkillForge Academy

**SkillForge Academy is an offline-first, extensible learning platform built around structured courses, guided instruction, practical application, and measurable mastery.**

Certification preparation is one application of a reusable academic platform, not the whole product. The project is open source under Apache-2.0 and is evolving from a mature certification study workspace into a course-first learner runtime.

## Project status

The latest published GitHub release is [v1.3.2](https://github.com/ForgeWireLabs/skillforge-academy/releases). The repository currently identifies its unreleased candidate as `1.4.1-beta.1`; that candidate is not a public release. `v2.0.0-beta.1` is a proposed milestone, with no tag or release published. See the [release readiness report](docs/v2.0-beta-readiness.md) and [version history](CHANGELOG.md).

The public Windows desktop release is the validated distribution path. Android has a development foundation but no public release commitment; iOS remains blocked on its host-tooling and runtime validation. The current course-platform surfaces are still in beta development. See the [feature maturity matrix](docs/feature-maturity.md) for what is implemented and what remains incomplete.

## What the application includes

- **Certification study workspace:** built-in CompTIA A+, Network+, and Security+ tracks with lessons, objective mapping, practice, mock exams, performance-based exercises, spaced-repetition cards, analytics, notes, and bookmarks. Certification questions and explanations are original educational material.
- **Reusable course runtime:** built-in certification lessons are projected into a shared course model. On current main, learners can also import and export a local `.skillforge-course` package. Packages are validated declarative data, not executable plugins.
- **Course progression:** Classroom activities and assessments use `CourseProgress` as their progression authority. Academic summaries derive from authored course data and progress rather than storing a second grade record.
- **Local learner ownership:** the app needs no account or cloud service. The legacy certification state and `.apexbackup` compatibility remain in place. New course-platform progress has its own versioned envelope; automatic migration of legacy certification progress into that runtime is not implemented yet.
- **Privacy and recovery:** the product does not send telemetry or crash reports. Optional diagnostics are user-initiated local exports. The existing encrypted backup format remains available; native Windows backup and restore for the new platform envelope still needs its own acceptance work.

The course platform can host authored lecture, academic, lab, and instructor catalogs, but current built-in track packages do not provide complete examples of every surface. Lecture formal-activity acceptance, capstone/evaluation parity, persistent lecture and lab state, native platform backup, and legacy-runtime migration are tracked as unfinished work. There is no public remote course catalog or required external instructor provider.

## Course packages and architecture

A course package has a versioned manifest, a canonical Course hierarchy, and optional authored catalogs. The host validates package identity and references, installs packages locally, and creates a runtime context. Course content cannot run JavaScript, native code, shell commands, or network calls.

```text
React + TypeScript learner interface
  ├─ legacy certification workspace and content banks
  └─ shared course runtime
       ├─ package validation and local registry
       ├─ Course / CourseProgress
       ├─ Classroom, Lecture, Academic, Labs, Instructor
       └─ versioned platform learner envelope
              └─ Tauri commands → bounded Rust file persistence
```

TypeScript owns course/package contracts, validation, learning logic, state derivation, and the serialized envelope owner. Rust owns the desktop command boundary and durable app-data file operations. The [platform architecture](docs/PLATFORM-ARCHITECTURE.md) documents persistence, shutdown, quarantine, and compatibility boundaries. The [package format](docs/COURSE-PACKAGE-FORMAT.md) and [security boundary](docs/COURSE-PACKAGE-SECURITY.md) define the public course contract.

## Technology

| Area | Current technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Native persistence | Rust |
| Interface | React 19 and TypeScript |
| Frontend build | Vite 8 |
| Tests | Vitest |
| Windows installer | Tauri NSIS bundle |

## Run locally

Frontend work requires Node.js 22, matching the repository's Windows release workflow:

    npm ci
    npm run dev

The browser development mode uses browser storage. For the native Windows application, install Rust stable and the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

    npm run desktop:dev

For a clean production build, run `npm run build`. Contributors should follow [the onboarding guide](docs/contributor-onboarding.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before changing the code or course content.

## Documentation

- [Documentation map](docs/README.md)
- [Learner getting-started guide](docs/getting-started.md)
- [Contributor onboarding](docs/contributor-onboarding.md)
- [Architecture and feature maturity](docs/PLATFORM-ARCHITECTURE.md), [maturity matrix](docs/feature-maturity.md), and [audit report](docs/documentation-audit-2026-10-09.md)
- [Course authoring](docs/certification-authoring.md) and [package contract](docs/COURSE-PACKAGE-FORMAT.md)
- [Privacy and security](docs/privacy-security.md), [backup and recovery](docs/backup-restore.md), and [diagnostics](docs/diagnostics.md)
- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md)

## Security, content, and licensing

Report suspected vulnerabilities through the process in [SECURITY.md](SECURITY.md), not a public issue. Do not include credentials, learner records, private course material, local machine paths, or proprietary integration details in public documentation, examples, fixtures, or pull requests. Describe optional integrations only through public contracts and sanitized examples.

All assessment material must be original. Do not contribute recalled live exam questions, exam dumps, reconstructed vendor PBQs, answer keys, or proprietary assessment content. CompTIA and its certification marks belong to their owners; SkillForge Academy is independent and is not affiliated with or endorsed by CompTIA. Apache-2.0 covers this repository's software and original content; it does not grant rights to third-party marks or assessment material. See [LICENSE](LICENSE) and the [content quality rubric](docs/content-quality-rubric.md).
## Acknowledgments

SkillForge Academy is built with open-source projects including Tauri, Rust, React, TypeScript, Vite, Vitest, and Recharts. Their maintainers and contributors make this work possible; their respective licenses remain with those projects. The complete dependency and license metadata is recorded in the repository manifests and lockfiles.
