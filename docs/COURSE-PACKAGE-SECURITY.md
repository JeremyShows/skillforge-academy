# Course Package Security V1.1

Packages are declarative data. The validator rejects executable-looking keys, paths, native/plugin fields, endpoint and credential fields, secret-shaped values, cyclic data, oversized payloads, unsupported capabilities, and contract-owned unknown fields. Unsupported capabilities are reported before installation and never executed.

Native learner persistence is a keyed, bounded, atomic JSON store. The browser path uses a versioned envelope with a backup key. Backup export uses the existing AES-256-GCM/PBKDF2 boundary and includes the platform envelope; legacy raw `.apexbackup` learner JSON remains importable.

