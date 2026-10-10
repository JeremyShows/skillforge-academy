# Private branch exposure incident summary

Date: 2026-10-05
Scope: public GitHub repository `JeremyShows/skillforge-academy`

An accidentally published private development commit was found on the public
branch `codex/private-package-canonical-authored-v1-3` at
`cb8e020dc1e8e69be14e2c4ec643af0ccca104a5`. The exact commit was preserved in
`a private origin` at the same branch name and SHA,
without force-pushing. Only the leaked public branch ref was then deleted.

The public repository's `main` ref was not modified. The intended public V1.3
ref was not modified. No merge, public-history rewrite, installer execution,
application launch, or learner-data operation was performed.

The public evidence in this directory records containment, ref integrity,
public marker scanning, and the redacted credential scan without reproducing
private course content or secret values. This incident remains open for
independent review.
