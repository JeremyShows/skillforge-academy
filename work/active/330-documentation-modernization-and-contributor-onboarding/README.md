# WI 330 — Documentation modernization and contributor onboarding

> **Status:** Active
> **Owner scope:** Governance and documentation
> **Baseline:** `origin/main` at `17be629702ef57ffd38db35c5d541745f02e73b0`
> **Release dependency:** None; this documentation milestone is independently deliverable.

## Intent

Bring public product, architecture, contributor, governance, roadmap, and release documentation in line with the current course-first source. Establish a contributor path that works from a clean public clone and distinguish the mature legacy certification workspace from course-platform features that remain experimental or proposed.

## Scope

- README, AGENTS, CONTRIBUTING, SECURITY, ROADMAP, CHANGELOG, docs navigation, learner guidance, and architecture/package boundaries.
- Feature-maturity and documentation discrepancy reports.
- A no-dependency documentation validator for local links, anchors, machine-specific paths, credential-shaped strings, private remote locations when configured, and version metadata consistency.
- Work-item and audit evidence for the documentation-only milestone.

## Out of scope

- Changing application version or Tauri identity.
- Building, tagging, publishing, or distributing a new release.
- Closing active WI 310, WI 311, or WI 322.
- Implementing proposed WI325–WI329 behavior.
- Changing learner data or app code beyond the documentation validation command.

## Acceptance

See `work-item.json`. Close this item only after the documentation validation and RepoPact gates pass, the PR has independent technical review and merges, and the separate governance-closeout procedure records accepted evidence.