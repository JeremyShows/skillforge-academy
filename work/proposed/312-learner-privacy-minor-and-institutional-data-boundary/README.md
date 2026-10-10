# Work Item 312 — Learner Privacy, Minor, and Institutional Data Boundary

**Status:** Proposed

## Intent

Preserve SkillForge Academy's current local-first privacy posture as the product
moves through real-learner beta testing and potentially toward mobile,
institutional, classroom, account, synchronization, or hosted features.

Today the strongest privacy control is architectural: learner progress, notes,
bookmarks, readiness analytics, and recall scheduling stay on the device; no
account or telemetry is required; diagnostic export is explicit; portable
backups are encrypted. WI312 records what must be true before future product
work expands that boundary.

## Pre-pilot scope split

The controlled pilot's participant notice, consent, data minimization, public
evidence rules, and stop conditions are now owned by [WI333](../333-pre-pilot-learner-privacy-gate/README.md).
WI228 depends on WI333; WI312 does not depend on WI228 or WI310. The first two
acceptance criteria below are narrowed to future collection and support
workflows beyond WI333. This amendment preserves the original work-item ID and
remaining institutional, hosted, and minor-data responsibilities while keeping
the required pilot safeguards ahead of recruitment.

## Current boundary

The current offline/local-first product does not become subject to FERPA merely
because it teaches certification material, and it does not become subject to
COPPA merely because a minor could conceivably use a desktop study tool.
Applicability depends on the actual distribution model, users, institutional
relationship, online data collection, and knowledge of a child's age.

The work item therefore tracks **conditions that create new obligations**, not a
blanket compliance claim.

## Future support/data workflows

Any future support or product workflow beyond the controlled pilot in WI333
must retain a bounded purpose, minimize collected data, use pseudonymous
identifiers where practical, and keep sensitive learner material out of public
issues, screenshots, fixtures, CI logs, and RepoPact evidence unless it is
explicitly redacted and authorized.

## Children / COPPA

Define a release and pilot boundary for minors. If SkillForge Academy becomes
child-directed, introduces online/cloud collection with actual knowledge of
under-13 users, or enters a school-controlled child workflow, collection must
not proceed under the ordinary general-audience assumptions. A separately
reviewed parental-consent, notice, minimization, retention, deletion, and
provider design is required first.

## Education records / FERPA

If a school, district, college, training program, or other education institution
uses a hosted/admin version and learner records are received or maintained on
its behalf, record whether FERPA or institution-specific student privacy rules
apply and define the required control relationship. The current standalone
local app should not be marketed as "FERPA compliant" merely because it stores
data privately.

## Future accounts, sync, and hosted analytics

Before adding accounts, cloud synchronization, cohort dashboards, instructor
analytics, remote diagnostics, telemetry, or hosted backups, define:

- data categories and purposes;
- user/institution controller/processor responsibilities;
- provider/subprocessor inventory;
- retention and deletion;
- access/export/correction paths;
- consent/notice requirements;
- age/minor handling;
- regional/privacy applicability; and
- whether aggregated/de-identified analytics are genuinely non-identifying.

## Assessment and certification data

Learner scores, weak-domain analytics, notes, accommodations/accessibility
feedback, and study history are sensitive user data even when no regulation
specifically attaches. Minimize their exposure and do not conflate them with
CompTIA's proprietary exam data or credential-verification systems.

## Non-goals

- claiming FERPA, COPPA, GDPR, CCPA, or SOC 2 compliance;
- adding accounts, telemetry, or hosted analytics in this work item;
- collecting birth dates simply to make compliance easier;
- storing learner data in Git-based evidence; or
- weakening the no-telemetry/local-first decision without a separately approved
  product decision.
