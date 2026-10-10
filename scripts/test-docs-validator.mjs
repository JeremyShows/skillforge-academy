import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectGovernanceJsonFiles, collectMarkdownFiles, findMachineSpecificPaths } from "./doc-paths.mjs";

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
  ["[share](//build-host/private-share)", true],
  ["https://cdn.example.com/docs", false],
  ["/assets/course-logo.svg", false],
];

for (const [sample, shouldMatch] of pathCases) {
  assert.equal(findMachineSpecificPaths(sample).length > 0, shouldMatch, `unexpected path classification: ${sample}`);
}

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicMarkdownPaths = new Set(collectMarkdownFiles(projectRoot).map(file => path.relative(projectRoot, file).replaceAll("\\", "/")));
const governanceJsonPaths = new Set(collectGovernanceJsonFiles(projectRoot).map(file => path.relative(projectRoot, file).replaceAll("\\", "/")));
for (const record of [
  "audits/AUDIT-2026-06-22-release-candidate-1.4.0.md",
  "work/completed/217-tauri-android-mobile-support-foundation/README.md",
  "evidence/security/2026-10-05-private-branch-exposure/incident-summary.md",
]) {
  assert.ok(publicMarkdownPaths.has(record), `repository-wide privacy scan must include ${record}`);
}
assert.ok(![...publicMarkdownPaths].some(file => file.startsWith(".venv/")), "repository-wide privacy scan must exclude the preserved virtual environment");
for (const record of [
  "work/active/330-documentation-modernization-and-contributor-onboarding/work-item.json",
  "evidence/runs/20261009-330-public-markdown-privacy-scan.json",
]) {
  assert.ok(governanceJsonPaths.has(record), `governance JSON privacy scan must include ${record}`);
}
assert.ok(![...governanceJsonPaths].some(file => file.startsWith(".venv/")), "governance JSON privacy scan must exclude the preserved virtual environment");

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
assert.ok(validator.includes("const publicMarkdownFiles = new Set(collectMarkdownFiles(root))"), "privacy checks must use the complete public Markdown file set");
assert.ok(validator.includes("const publicGovernanceJsonFiles = new Set(collectGovernanceJsonFiles(root))"), "privacy checks must include evidence and work-item JSON records");
assert.ok(validator.includes("const privacyScanFiles = new Set([...publicMarkdownFiles, ...publicGovernanceJsonFiles])"), "path, credential, and configured-remote scans must cover Markdown and governance JSON");
assert.ok(validator.includes("for (const file of [...privacyScanFiles].sort())"), "path and credential scans must use the complete privacy-scan set");
assert.ok(validator.includes("for (const file of privacyScanFiles)"), "configured-remote scans must use the complete privacy-scan set");

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
const lastEditor = closeoutSection.lastIndexOf("notepad.exe audits/index.md");
const saveAndClosePrompt = closeoutSection.indexOf('Read-Host "Save and close all opened editors, then press Enter to continue"');
const moveWorkItem = closeoutSection.indexOf("git mv -- $workItemDirectoryRelative $completedDirectory");
assert.ok(lastEditor < saveAndClosePrompt && saveAndClosePrompt < moveWorkItem, "closeout example must wait for edits to be saved before moving the work item");
assert.ok(validator.includes(String.raw`ssh:\/\/git@github\.com\/JeremyShows\/skillforge-academy`), "canonical SSH remote form must be excluded from protected-remote scanning");

process.stdout.write(`Documentation validator regression checks passed: ${pathCases.length} path cases, repository-wide Markdown and governance JSON privacy-scan scope, workflow and closeout consistency, and canonical SSH remote coverage.\n`);
