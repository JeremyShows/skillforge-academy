# Package Validation Evidence

The package contract tests cover valid built-ins, duplicate IDs, format
versions, course identity, module/lesson/activity references, lecture and lab
relationships, instructor modes, unsupported capabilities, executable fields,
commands, local paths, secret-shaped fields, size bounds, deterministic
serialization, import/export, registry installation, update policy, and
removal with archived progress.

The public validator is implemented in `src/platform/packageValidation.ts` and
the registry in `src/platform/registry.ts`.

