# Course Package Security V1

Course packages are untrusted data. The validator rejects executable/script,
command, shell, PowerShell, Bash, process, native-library, dynamic-import,
arbitrary local-path, environment-variable, endpoint, credential, and
secret-shaped fields.

The package parser applies a pre-parse byte bound where possible and the
validator applies bounded strings, collections, references, lectures, labs,
assets, and migrations. Unknown or unsupported capabilities are reported and
are never silently executed.

The runtime supplies behavior through compiled platform code. A package can
declare that it needs a capability, but it cannot install an adapter, select a
secret provider, fetch a URL, run a process, or load a native library.

Future executable labs require a separately reviewed capability, sandbox, and
authority model. They are not smuggled into the V1 package format.

