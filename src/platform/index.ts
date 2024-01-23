import { GitlabPlatform } from "./gitlab";

export interface Platform {
  type: string;
  isSupported(): boolean;
  getCommitSha(): string;
  getCommitRefName(): string;
  getGitTag(): string | undefined;
}

export const platforms = Object.fromEntries(
  [new GitlabPlatform()].map((a) => [a.type, a])
);

export const specificPlatformTypes = Object.keys(platforms);

export function resolvePlatform(platformType: string): Platform {
  if (platformType === "auto") {
    return resolveAutoPlatform();
  }

  const platform = platforms[platformType];
  if (!platform) {
    throw new Error(`Unknown platform: ${platformType}`);
  }

  return platform;
}

function resolveAutoPlatform(): Platform {
  const platformType = specificPlatformTypes.find((t) =>
    platforms[t].isSupported()
  );

  if (!platformType) {
    throw new Error("Platform could not be resolved automatically.");
  }

  return platforms[platformType];
}
