# Public ref audit

Audit point: 2026-10-05, after deletion of the leaked public branch.

## Ref actions

| Ref | Result |
| --- | --- |
| `codex/private-package-canonical-authored-v1-3` on the public repository | Deleted with a normal ref deletion; no force push. |
| `codex/private-package-canonical-authored-v1-3` on the private repository | Preserved at `cb8e020dc1e8e69be14e2c4ec643af0ccca104a5`. |
| All other public branches | Not deleted or rewritten. |
| Public tags | Not deleted or rewritten. |

## Reachability results

The initial containment audit enumerated 13 remaining public branches and 6
public tags. After this public evidence branch was pushed, a final re-audit
enumerated 14 public branches and 6 public tags. Both audits examined
reachable object paths and ref-tip text for the known private marker classes.
Final results:

- Reachable private-marker path matches: 0.
- Ref-tip private-marker text matches: 0.
- Credential-pattern findings in the separately recorded leaked-history scan: 0.

This record intentionally omits private filenames, authored content, and
secret values. The deleted public ref is absent from the post-containment
remote listing.
