---
id: 0011
title: "Canonical Platform Learner Envelope Owner"
status: accepted
date: 2026-10-09
supersedes: []
---

# 0011: Canonical Platform Learner Envelope Owner

## Context

The platform learner envelope already has per-course slots for CourseProgress,
classroom context, lecture delivery, and lab runs. The UI currently performs
independent asynchronous read/merge/write operations, so concurrent saves can
lose updates and default state can become interactive before persisted state
loads. Academic Record is computed from authored catalog data and CourseProgress.

## Decision

1. `PlatformLearnerEnvelope` is the one in-memory and persisted container for
   generic course-platform learner state.
2. One owner hydrates, sanitizes, snapshots, serializes mutations, reports
   durability, and flushes pending work. UI components request changes through
   this owner and do not implement persistence read/merge/write themselves.
3. `CourseProgress` remains the academic authority. Academic Record remains a
   derived projection and is not independently persisted.
4. The envelope remains schema-compatible with existing course entries and
   namespace `${packageId}@${courseVersion}` in WI324. Legacy certification
   state is not migrated until a separate work item proves the foundation.
5. Lecture and lab envelope slots are reserved for their later integrations;
   defining the owner does not implement those systems.

## Consequences

Platform state changes require hydration before learner mutation and a single
ordered durable-write pipeline. Later work may add legacy migration, lecture
and lab persistence, capstone stage context, and native backup workflows, but
must use this owner rather than create parallel persistence authorities.