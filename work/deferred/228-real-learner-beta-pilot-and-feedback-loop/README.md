# 228 - Real learner beta pilot and feedback loop

> **Status**: Deferred
>
> Deferred until the pre-beta candidate gate (`310`) is green. Prior UX/IA
> work (`308`/`309`) and July release-support items (`225`–`227`) are also
> prerequisites. WI333 is the mandatory pre-pilot privacy gate. WI312 is future
> institutional/hosted privacy architecture and is not a pilot prerequisite.
> Resume only after all registered dependencies pass; before any recruitment,
> confirm the exact candidate identity in the runbook.
> **Owners**: Steward/Product lead; QA and Content Specialists support.
> **Depends on**: 219, 220, 221, 222, 225, 226, 227, 308, 309, 310, 333.

## Intent

The repo has strong automated validation, but it needs contact with real
learners. This item creates a small, structured beta loop that tests whether the
product is understandable, trustworthy, and useful outside our own build bubble.

`310` supplies the uniquely identifiable Windows candidate, acceptance evidence,
accessibility cohort decision, and pilot operating rules. This item runs the
learner loop against that frozen artifact—not against an unpinned `1.4.0` build.
WI333 supplies the participant-data boundary required before real learners are
recruited. WI312's later institutional and hosted-data architecture does not
delay a pilot that stays within WI333's controlled local-first boundary.

The retained WI310 installer is the historical `1.4.1-beta.1` candidate. A
pilot run against it does not qualify any later v2.0 binary. Any v2.0 learner
validation must name its own clean source commit, installer hash, runbook, and
evidence; maintainers must explicitly amend or create the work item that owns
that candidate before using it for recruitment.

## Scope

- Beta participant script keyed to the `310` candidate.
- Feedback form (including version/build/`content.revision` and severity).
- Minimum beta cohort definition (Windows-first; honor AT scope from `310`).
- Triage process for feedback.
- Beta report and release recommendation.

## Suggested Pilot Script

Ask each participant to:

1. Install the exact `310` candidate (verify checksum).
2. Pick their relevant track.
3. Study for at least 30 minutes.
4. Complete a short practice session.
5. Use the lesson reader and flashcards.
6. Try PBQ Lab.
7. Start or complete a mock exam.
8. Create a backup.
9. Restore/import the backup if practical.
10. Report confusion, trust issues, bugs, and moments that felt useful—recording
    app version, build ID, `content.revision`, and track/exam/domain involved.

## Operating rules (from 310)

Follow the `310` runbook for distribution boundary, SmartScreen/unsigned
guidance, consent/privacy, support channel, severity definitions, and
stop-the-pilot conditions. Do not broaden to public recruitment from this item.

## Closeout

Close when real learner feedback has been collected, triaged, and converted into
fixes or follow-up work with a clear release recommendation.
