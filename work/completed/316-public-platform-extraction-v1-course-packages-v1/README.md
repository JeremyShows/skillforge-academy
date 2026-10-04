# 316 — Public Platform Extraction V1 and Course Package Architecture V1

> **Status:** Active on `codex/platform-v2-course-packages`, based on public
> main `d35510e0ec7df51af7ec85f32699dd3ebabd6fcd`.

## Intent

Make public SkillForge the canonical generic application runtime. Establish a
declarative `.skillforge-course` package contract, registry, validator,
capability negotiation, generic course context, and built-in public course
adapters without exposing private course material or private Git history.

## Explicit limits

No private content, private evidence, private screenshots, private fixtures,
private repository history, full Course Studio UI, course marketplace/site,
release, installer publication, or public-main merge.

## Required boundary

Packages are data, not executable plugins. The platform owns behavior,
provider configuration, persistence, validation, and runtime capabilities.
Private authored courses remain in private package work and must conform to the
same contract without entering this repository.

