import { readdirSync } from "node:fs";
import path from "node:path";

const machinePathPatterns = [
  // A drive letter is the machine-specific part; do not depend on a short list
  // of familiar directory names such as Users, Projects, or Android.
  /(?<![A-Za-z0-9_])[A-Za-z]:[\\/][^\s`"<>|?*]+/g,
  // UNC paths can reveal a workstation or internal host even without a drive.
  /(?<![\\/])(?:\\\\[^\\/\s`"<>]+\\[^\\/\s`"<>]+(?:\\[^\s`"<>]*)?|\\\\\\\\[^\\/\s`"<>]+\\\\[^\\/\s`"<>]+(?:\\\\[^\s`"<>]*)?)/g,
  // Treat slash-separated host/share paths as UNC-like even inside Markdown
  // link destinations. External links should use an explicit https:// scheme;
  // a protocol-relative //host/share value is ambiguous and must be reviewed.
  /(^|[\s"'`(<=])\/\/[^/\s`"<>]+\/[^/\s`"<>]+(?:\/[^\s`"<>]*)?/gm,
  // Common user- and host-specific POSIX roots. Repository-relative paths and
  // root-relative web assets are intentionally not treated as local paths.
  /(?<![A-Za-z0-9_])\/(?:Users|home|root|mnt|Volumes|private|tmp|var\/tmp|workspace)\/[^\s`"<>]+/g,
];

export function collectMarkdownFiles(root, ignoredDirectories = new Set([".git", "node_modules", ".venv", "dist", "target"])) {
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) walk(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.push(path.join(directory, entry.name));
      }
    }
  }
  walk(root);
  return files.sort();
}

export function collectGovernanceJsonFiles(root, ignoredDirectories = new Set([".git", "node_modules", ".venv", "dist", "target"])) {
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) walk(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        files.push(path.join(directory, entry.name));
      }
    }
  }
  for (const directory of ["evidence", "work"]) walk(path.join(root, directory));
  return files.sort();
}

export function findMachineSpecificPaths(source) {
  return machinePathPatterns
    .flatMap((pattern, patternIndex) => [...source.matchAll(pattern)].map(match => {
      const prefixLength = patternIndex === 2 ? match[1].length : 0;
      return { value: match[0].slice(prefixLength), index: match.index + prefixLength };
    }))
    .sort((left, right) => left.index - right.index);
}
