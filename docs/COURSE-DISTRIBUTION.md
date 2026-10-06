# Course Distribution Boundary V1.2

The future distribution flow is:

`SkillForge Course Library` → immutable `.skillforge-course` download → local
validator → authored-surface review → install.

No marketplace or website is implemented here. A future host needs only package
metadata such as package ID, title, version, publisher, license, capabilities,
minimum app version, size, hash, and signature status. It must not need to know
course internals or receive learner state.

## Local lifecycle

The implemented local lifecycle is:

1. Select **Import Course Package** in the Academy shell.
2. Read the package as data and validate the manifest, canonical course, and
   optional catalogs against the versioned schema. Capability names and
   authored catalogs are checked independently; capabilities remain descriptive
   metadata rather than UI activation switches.
3. Reject unknown contract fields, malformed references, unsupported
   capabilities, executable-looking values, and invalid formal-activity source
   tuples before install. The validator does not yet enforce a strict
   bidirectional capability-to-catalog consistency rule.
4. Add the package to `CourseRegistry` and persist only its identity metadata.
5. Create a namespaced `CourseRuntimeContext` when the learner opens it.
6. Keep learner progress in the platform envelope rather than inside the
   exported package.
7. Export the authored package when a local copy or transfer is needed.

An update must have a higher semantic `packageVersion`. The registry keeps the
course identity stable, reports the update, and lets the persistence layer
apply any declared migration policy. Removing a package is a registry action;
learner state can be retained for recovery rather than silently discarded.

## Trust boundary

The host does not execute package content. A package can describe a lecture,
academic record, or deterministic lab, but it cannot install a plugin, run a
command, open a network connection, or mutate learner state directly. Lecture,
Academic, and Labs surfaces require their corresponding validated authored
catalogs. The instructor fallback works without a profile; `package.instructor`
is optional customization. Remediation remains part of the canonical Course
activity/progress flow. The formal lecture bridge also fails closed if a
segment cannot resolve its exact course activity tuple.

Local import is the V1 proof of this boundary. Network discovery, signatures,
trusted publishers, remote updates, revocation, and catalog policy remain
future distribution work. The future host should provide package metadata such
as package ID, title, version, publisher, license, capabilities, minimum app
version, size, hash, and signature status without receiving learner state.
