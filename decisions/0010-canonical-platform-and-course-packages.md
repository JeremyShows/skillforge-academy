---
id: 0010
title: "Canonical SkillForge Runtime and Declarative Course Packages"
status: accepted
date: 2026-10-04
supersedes: []
---

# 0010: Canonical SkillForge Runtime and Declarative Course Packages

## Context

SkillForge has a modern course/classroom architecture and an older public
certification workspace. Maintaining two superior application runtimes would
split compatibility, accessibility, persistence, and future authoring work.

## Decision

1. The public SkillForge application is the canonical generic runtime.
2. Courses are versioned, declarative `.skillforge-course` packages.
3. Packages are data and cannot execute JavaScript, Rust, shell commands,
   native plugins, arbitrary paths, network providers, or secrets.
4. Built-in and imported courses use the same package and registry contracts.
5. CourseProgress remains the academic authority; packages cannot grant
   mastery or bypass assessment rules.
6. Instructor provider configuration belongs to the installation/runtime, not
   package secrets or private endpoint assumptions.
7. Labs are explicit runtime capabilities with bounded deterministic behavior.
8. Course Studio will author the same canonical package models consumed by the
   learner runtime.
9. Private courses are packages, not permanently better application forks.
10. Public Git history must never contain private course content, evidence,
    fixtures, screenshots, or learner state.

## Consequences

The old public learner state, certification banks, backups, Tauri/mobile
foundations, accessibility, and release surfaces remain compatibility anchors.
Generic adapters may initially expose them through the package registry. Full
Course Studio, marketplace distribution, signatures, and executable lab
sandboxes remain future work.

