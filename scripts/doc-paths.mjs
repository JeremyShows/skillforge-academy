const machinePathPatterns = [
  // A drive letter is the machine-specific part; do not depend on a short list
  // of familiar directory names such as Users, Projects, or Android.
  /(?<![A-Za-z0-9_])[A-Za-z]:[\\/][^\s`"<>|?*]+/g,
  // UNC paths can reveal a workstation or internal host even without a drive.
  /(?<![\\/])\\\\[^\\/\s`"<>]+\\[^\\/\s`"<>]+(?:\\[^\s`"<>]*)?/g,
  // Accept slash-separated UNC spellings in prose and code, while avoiding
  // protocol-relative Markdown URLs that begin immediately after a parenthesis.
  /(^|[\s"'`])\/\/[^/\s`"<>]+\/[^/\s`"<>]+(?:\/[^\s`"<>]*)?/gm,
  // Common user- and host-specific POSIX roots. Repository-relative paths and
  // root-relative web assets are intentionally not treated as local paths.
  /(?<![A-Za-z0-9_])\/(?:Users|home|root|mnt|Volumes|private|tmp|var\/tmp|workspace)\/[^\s`"<>]+/g,
];

export function findMachineSpecificPaths(source) {
  return machinePathPatterns
    .flatMap((pattern, patternIndex) => [...source.matchAll(pattern)].map(match => {
      const prefixLength = patternIndex === 2 ? match[1].length : 0;
      return { value: match[0].slice(prefixLength), index: match.index + prefixLength };
    }))
    .sort((left, right) => left.index - right.index);
}
