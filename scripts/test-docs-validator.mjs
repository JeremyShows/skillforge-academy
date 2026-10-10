import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findMachineSpecificPaths } from "./doc-paths.mjs";

const pathCases = [
  [String.raw`D:\workstation\Android\Sdk\ndk\26.3\source.properties`, true],
  ["E:/tools/android-sdk/platform-tools", true],
  [String.raw`\\build-host\share\workspace\repo`, true],
  ["//build-host/share/workspace/repo", true],
  ["/home/example/project", true],
  ["/Users/example/project", true],
  ["$env:LOCALAPPDATA\\Android\\Sdk", false],
  ["$env:ANDROID_HOME\\platform-tools", false],
  ["src-tauri\\Cargo.toml", false],
  ["https://example.com/docs", false],
  ["[mirror](//cdn.example.com/docs)", false],
  ["/assets/course-logo.svg", false],
];

for (const [sample, shouldMatch] of pathCases) {
  assert.equal(findMachineSpecificPaths(sample).length > 0, shouldMatch, `unexpected path classification: ${sample}`);
}

const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
const validator = readFileSync(new URL("./validate-docs.mjs", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../docs/contributor-onboarding.md", import.meta.url), "utf8");
const actionsSection = onboarding.match(/### Current GitHub Actions coverage[\s\S]*?(?=\n### |\n## |$)/)?.[0];
const closeoutSection = onboarding.match(/### Governance closeout example[\s\S]*?(?=\n## |$)/)?.[0];
assert.ok(actionsSection, "onboarding must describe the current Actions coverage separately");
assert.ok(closeoutSection, "onboarding must document governance closeout separately");

for (const command of [
  "npm run validate:content",
  "npm run validate:a11y",
  "npm test",
  "npm run build",
  "cargo fmt --check --manifest-path src-tauri/Cargo.toml",
  "cargo check --manifest-path src-tauri/Cargo.toml",
]) {
  assert.ok(workflow.includes(command), `expected release workflow to run ${command}`);
  assert.ok(actionsSection.includes(command), `onboarding must list workflow command ${command}`);
}

assert.ok(!workflow.includes("npm run validate:docs"), "release workflow does not run the documentation validator");
assert.ok(!workflow.includes("repopact.cli validate"), "release workflow does not run RepoPact validation");
assert.ok(actionsSection.includes("It does not run `npm run validate:docs` or RepoPact validation."), "onboarding must state that local-only checks are absent from Actions");

for (const assignment of [
  '$python = ".\\.venv\\Scripts\\python.exe"',
  '$itemId = Read-Host',
  '$evidenceId = Read-Host',
]) {
  assert.ok(closeoutSection.includes(assignment), `closeout example must initialize ${assignment}`);
}
assert.ok(closeoutSection.includes("if ($itemMatches.Count -ne 1)"), "closeout example must fail when the work item is missing or ambiguous");
assert.ok(closeoutSection.includes("if ($itemId -notmatch '^[0-9]{3,}$')"), "closeout example must validate the work-item ID before using it in a branch name");
assert.ok(closeoutSection.includes("if ($evidenceId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$')"), "closeout example must reject evidence IDs that could escape the evidence directory");
assert.ok(closeoutSection.includes("if (-not (Test-Path -LiteralPath $evidencePath))"), "closeout example must verify the evidence path");
assert.ok(closeoutSection.includes("$workItemDirectoryRelative = Resolve-Path -LiteralPath $workItemDirectory -Relative"), "closeout example must use a repository-relative Git source path");
assert.ok(closeoutSection.includes("git mv -- $workItemDirectoryRelative $completedDirectory"), "closeout example must stage the work-item status-directory move");
assert.ok(closeoutSection.includes("git add -- $evidencePath audits/reports/dashboard.md audits/index.md"), "closeout example must stage evidence, generated dashboard, and audit index");
assert.ok(validator.includes(String.raw`ssh:\/\/git@github\.com\/JeremyShows\/skillforge-academy`), "canonical SSH remote form must be excluded from protected-remote scanning");

process.stdout.write(`Documentation validator regression checks passed: ${pathCases.length} path cases, workflow and closeout consistency, and canonical SSH remote coverage.\n`);
