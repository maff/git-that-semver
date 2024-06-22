import chalk from "chalk";

import { logger } from "../logging";
import { GitHubPlatform } from "./github";
import { GitLabPlatform } from "./gitlab";

const platformLogger = logger.childLogger("platform");

export interface Platform {
  type: string;
  isSupported(): boolean;
  getCommitSha(): string;
  getCommitRefName(): string;
  getChangeRequestIdentifier(): string | undefined;
  getGitTag(): string | undefined;
}

export const platforms = Object.fromEntries(
  [new GitHubPlatform(), new GitLabPlatform()].map((a) => [a.type, a]),
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
  platformLogger.debug("Resolving platform automatically");

  const platformType = specificPlatformTypes.find((t) =>
    platforms[t].isSupported(),
  );

  if (!platformType) {
    throw new Error("Platform could not be resolved automatically.");
  }

  platformLogger.info(`Resolved platform: ${chalk.white.bold(platformType)}`);

  return platforms[platformType];
}
