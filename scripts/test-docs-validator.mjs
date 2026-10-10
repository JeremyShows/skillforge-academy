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
const onboarding = readFileSync(new URL("../docs/contributor-onboarding.md", import.meta.url), "utf8");
const actionsSection = onboarding.match(/### Current GitHub Actions coverage[\s\S]*?(?=\n### |\n## |$)/)?.[0];
assert.ok(actionsSection, "onboarding must describe the current Actions coverage separately");

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

process.stdout.write(`Documentation validator regression checks passed: ${pathCases.length} path cases and release-workflow/onboarding consistency.\n`);
