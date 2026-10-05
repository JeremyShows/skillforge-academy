# 321 — Private branch exposure remediation 2026-10-05

> **Status**: Completed / independently reviewed.
> **Owners**: governance and release review.
> **Depends on**: 320.

## Intent

Contain the accidental publication of a private development branch while
preserving the exact commit in the private repository. Verify that public
refs, public main, the intended public V1.3 branch, and credentials remain
safe. This work does not merge, rewrite, or modify public `main`, and does not
execute the installer or touch learner data.

## Decisions

- Preserve the exact commit object in the private repository before deleting
  the leaked public ref.
- Use a separate evidence branch for the private provenance record so the
  recovered target branch remains exactly at the requested SHA.
- Keep public evidence marker-level and operational; do not reproduce private
  course content or secret values.

## Scope

- `evidence/security/2026-10-05-private-branch-exposure/`
- This governance work item.

## Acceptance evidence

- Ref containment and all-public-ref audit: `ref-audit.md`.
- Main preservation: `public-main-verification.md`.
- Public V1.3 preservation: `correct-public-v1-3-verification.md`.
- Credential scan: `secret-scan-summary.md`.
- Action boundary and independent-review gate: `remediation-actions.md`.

## Closeout

Independent review approved closeout after confirming the exact private
recovery, deletion of the leaked public ref, the final 14-branch/6-tag audit
with zero private-marker matches, and the public-safe evidence boundary.
WI321 AC-6 is satisfied. The incident is closed; new work must not reopen its
architecture without contradictory evidence.
