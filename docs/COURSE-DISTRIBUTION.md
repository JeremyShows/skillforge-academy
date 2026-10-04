# Course Distribution Boundary

The future distribution flow is:

`SkillForge Course Library` → immutable `.skillforge-course` download → local
validator → capability review → install.

No marketplace or website is implemented here. A future host needs only package
metadata such as package ID, title, version, publisher, license, capabilities,
minimum app version, size, hash, and signature status. It must not need to know
course internals or receive learner state.

Local import is the V1 proof of this boundary. Network discovery, signatures,
trusted publishers, updates from a remote source, and revocation remain future
distribution work.

