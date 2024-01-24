import type { SemVer } from "semver";

// "clean" semver version (without v prefix, but including the build part)
export function cleanSemVerVersionString(version: SemVer): string {
  let cleanSemVerVersion = version.version;
  if (version.build.length > 0) {
    cleanSemVerVersion += `+${version.build.join(".")}`;
  }

  return cleanSemVerVersion;
}
