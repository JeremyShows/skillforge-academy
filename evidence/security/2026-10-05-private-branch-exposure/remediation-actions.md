# Remediation actions and review boundary

- [x] Preserve the exact leaked commit in the private repository at the exact
  requested branch and SHA.
- [x] Verify the exact commit, tree, parent, and provenance before public ref
  deletion.
- [x] Delete only the leaked public branch ref with a normal, non-force push.
- [x] Audit all remaining public branches and tags for private-marker
  reachability.
- [x] Verify public `main` and the intended public V1.3 branch retain their
  required SHAs.
- [x] Run the redacted credential scan over the leaked tree and reachable
  history; no findings were emitted.
- [x] Preserve the installer artifact without executing, rebuilding, or
  installing it. Recorded SHA-256:
  `B365FA068FB29327005EB6DC4F6FAFD4CC6E50A6D75497B1B55378B418987CF8`.
- [x] Leave learner data and the shared dirty checkout untouched.
- [ ] Independent reviewer confirms the remote ref audit, private recovery,
  and evidence safety.

The coding-agent action boundary ends here. Do not merge this branch, modify
public `main`, execute the installer, launch the app, or delete additional
branches without a separately reviewed decision.
