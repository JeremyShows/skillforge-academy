---
id: 0012
title: "Separate Pre-Pilot Privacy Safeguards From Future Institutional Privacy Architecture"
status: accepted
date: 2026-10-09
supersedes: []
---

# 0012: Separate Pre-Pilot Privacy Safeguards From Future Institutional Privacy Architecture

## Context

WI312 grouped two different prerequisites: privacy safeguards required before
real learner participation and future institutional, hosted, and minor-data
architecture. Its dependency on WI228 placed some pilot protections after the
pilot itself. WI228 already depends on WI310's candidate readiness, but that
does not provide the participant-data boundary.

## Decision

1. WI333 owns the limited local-first participant notice, consent, minimization,
   feedback, public-evidence, and stop conditions required before WI228.
2. WI228 depends on WI333 and its existing candidate/readiness prerequisites.
3. WI312 retains future institutional, hosted, and minor-data requirements; it
   is not a prerequisite to WI228 and does not depend on the pilot.
4. No product or release record may claim COPPA, FERPA, GDPR, CCPA, or other
   regulatory compliance without substantiated deployment facts and controls.
5. WI333 does not add telemetry, accounts, synchronization, or hosted data
   collection and does not alter the no-telemetry decision in 0009.

## Consequences

The learner pilot remains deferred until both candidate readiness and WI333
have evidence-backed closeout. Future hosted/institutional privacy work can be
researched independently without delaying a properly bounded local-first pilot.
The split is represented with existing RepoPact `depends_on` and acceptance
criteria; no RepoPact Core schema change is required.
