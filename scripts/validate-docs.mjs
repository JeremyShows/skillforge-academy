import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMachineSpecificPaths } from "./doc-paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entryDocs = ["README.md", "AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", "ROADMAP.md", "CHANGELOG.md"];
const ignoredDirectories = new Set([".git", "node_modules", ".venv", "dist", "target"]);
const issues = [];
const markdownFiles = new Set();

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) walk(path.join(directory, entry.name));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      markdownFiles.add(path.join(directory, entry.name));
    }
  }
}

for (const relative of entryDocs) markdownFiles.add(path.join(root, relative));
walk(path.join(root, "docs"));

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function slugHeading(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function headingIds(source) {
  const ids = new Set();
  const counts = new Map();
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const base = slugHeading(heading[1]);
      if (!base) continue;
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      ids.add(count ? `${base}-${count}` : base);
    }
    for (const anchor of line.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/gi)) ids.add(anchor[1]);
  }
  return ids;
}

function addIssue(file, line, message) {
  issues.push(`${path.relative(root, file).replaceAll("\\", "/")}:${line}: ${message}`);
}

const credentialPattern = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9]{20,})\b/g;
const inlineLinkPattern = /!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
const referenceLinkPattern = /^\s*\[[^\]]+\]:\s*(\S+)/gm;
const cache = new Map();

function readMarkdown(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(file, "utf8"));
  return cache.get(file);
}

function validateLink(sourceFile, source, line, destination) {
  const target = destination.trim().replace(/^<|>$/g, "");
  if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) return;
  const hashAt = target.indexOf("#");
  const queryAt = target.indexOf("?");
  const cutAt = [hashAt, queryAt].filter(index => index >= 0).reduce((a, b) => Math.min(a, b), target.length);
  const pathPart = target.slice(0, cutAt);
  const fragment = hashAt >= 0 ? decodeURIComponent(target.slice(hashAt + 1).split("?")[0]) : "";
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathPart).replaceAll("/", path.sep);
  } catch {
    addIssue(sourceFile, line, `invalid URL encoding in local link: ${target}`);
    return;
  }
  const targetFile = decodedPath.startsWith(path.sep)
    ? path.resolve(root, `.${decodedPath}`)
    : path.resolve(path.dirname(sourceFile), decodedPath || path.basename(sourceFile));
  if (!targetFile.startsWith(root + path.sep) && targetFile !== root) {
    addIssue(sourceFile, line, `local link escapes the repository: ${target}`);
    return;
  }
  if (!statExists(targetFile)) {
    addIssue(sourceFile, line, `missing local link target: ${target}`);
    return;
  }
  if (fragment && targetFile.toLowerCase().endsWith(".md")) {
    const headings = headingIds(readMarkdown(targetFile));
    if (!headings.has(fragment)) addIssue(sourceFile, line, `missing heading anchor in ${path.relative(root, targetFile)}: #${fragment}`);
  }
}

function statExists(file) {
  try { return statSync(file).isFile() || statSync(file).isDirectory(); } catch { return false; }
}

for (const file of [...markdownFiles].sort()) {
  if (!statExists(file)) {
    issues.push(`${path.relative(root, file)}: referenced entry document is missing`);
    continue;
  }
  const source = readMarkdown(file);
  for (const match of findMachineSpecificPaths(source)) addIssue(file, lineAt(source, match.index), "machine-specific absolute path must not be published");
  for (const match of source.matchAll(credentialPattern)) addIssue(file, lineAt(source, match.index), "credential-shaped value must not be published");
  const linkSource = source
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, block => block.replace(/[^\r\n]/g, " "))
    .replace(/`+[^`\r\n]*`+/g, span => span.replace(/[^\r\n]/g, " "));
  for (const match of linkSource.matchAll(inlineLinkPattern)) validateLink(file, source, lineAt(source, match.index), match[1] ?? match[2] ?? "");
  for (const match of linkSource.matchAll(referenceLinkPattern)) validateLink(file, source, lineAt(source, match.index), match[1]);
}

// Protect locations from every configured remote except this repository's public
// canonical remote. Remote names are local labels, so they do not determine privacy.
// Values are never included in errors.
try {
  const remotes = execFileSync("git", ["config", "--get-regexp", "^remote\\..*\\.url$"], { cwd: root, encoding: "utf8" });
  const configuredRemotes = remotes.split(/\r?\n/).filter(Boolean).map(line => line.split(/\s+/, 2));
  for (const [, remoteUrl] of configuredRemotes) {
    if (!remoteUrl) continue;
    const normalized = remoteUrl.replace(/\.git$/i, "").replace(/\/$/, "");
    if (/^(?:https:\/\/github\.com\/JeremyShows\/skillforge-academy|git@github\.com:JeremyShows\/skillforge-academy|ssh:\/\/git@github\.com\/JeremyShows\/skillforge-academy)$/i.test(normalized)) continue;
    const githubSlug = normalized.match(/github\.com[:/]([^/]+\/[^/]+)$/i)?.[1];
    const protectedLocations = [remoteUrl, normalized, githubSlug].filter(Boolean).map(value => value.toLowerCase());
    for (const file of markdownFiles) {
      const source = readMarkdown(file);
      const offset = protectedLocations.map(value => source.toLowerCase().indexOf(value)).find(value => value >= 0);
      if (offset !== undefined) addIssue(file, lineAt(source, offset), "location associated with a non-canonical Git remote appears in public documentation");
    }
  }
} catch {
  // Git configuration can be unavailable in source archives; other checks still run.
}

const version = readFileSync(path.join(root, "VERSION"), "utf8").trim();
const releaseLabel = readFileSync(path.join(root, "RELEASE_LABEL"), "utf8").trim();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const tauri = JSON.parse(readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const cargo = readFileSync(path.join(root, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (releaseLabel.replace(/-.*/, "") !== version) issues.push("release metadata: RELEASE_LABEL base does not match VERSION");
for (const [name, value] of [["package.json", packageJson.version], ["tauri.conf.json", tauri.version], ["Cargo.toml", cargoVersion]]) {
  if (value !== releaseLabel) issues.push(`release metadata: ${name} version does not match RELEASE_LABEL`);
}

if (issues.length) {
  process.stderr.write(`Documentation validation failed with ${issues.length} issue(s):\n${issues.map(issue => `- ${issue}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Documentation validation passed: ${markdownFiles.size} Markdown files, local links/anchors, privacy patterns, and release metadata. External URL availability is not checked.\n`);
}
