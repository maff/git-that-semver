import { style, logger } from "../logging";
import { GitPlatform } from "./git";
import { GitHubPlatform } from "./github";
import { GitLabPlatform } from "./gitlab";
import {
  MANUAL_PLATFORM_REQUIRED_OPTIONS_ERROR,
  ManualPlatform,
  type ManualPlatformOptions,
} from "./manual";

const platformLogger = logger.childLogger("platform");

export interface Platform {
  type: string;
  getCommitSha(): string;
  getCommitRefName(): string;
  getChangeRequestIdentifier(): string | undefined;
  getGitTag(): string | undefined;
}

export interface AutoDetectablePlatform extends Platform {
  isSupported(): boolean;
}

export const autoDetectablePlatforms = Object.fromEntries(
  [new GitHubPlatform(), new GitLabPlatform()].map((a) => [a.type, a]),
);

export const specificPlatformTypes = Object.keys(autoDetectablePlatforms);

export const allPlatformTypes = [...specificPlatformTypes, "git", "manual"];

export function resolvePlatform(
  platformType: string,
  manualOpts?: ManualPlatformOptions,
): Platform {
  if (platformType === "auto") {
    if (manualOpts) {
      const platform = new ManualPlatform(manualOpts);
      platformLogger.info(
        `Resolved platform: ${style.white.bold("manual")} (manual options provided)`,
      );
      return platform;
    }
    return resolveAutoPlatform();
  }

  if (platformType === "git") {
    platformLogger.info(`Resolved platform: ${style.white.bold("git")}`);
    return new GitPlatform();
  }

  if (platformType === "manual") {
    if (!manualOpts) {
      throw new Error(MANUAL_PLATFORM_REQUIRED_OPTIONS_ERROR);
    }
    const platform = new ManualPlatform(manualOpts);
    platformLogger.info(`Resolved platform: ${style.white.bold("manual")}`);
    return platform;
  }

  const platform = autoDetectablePlatforms[platformType];
  if (!platform) {
    throw new Error(`Unknown platform: ${platformType}`);
  }

  return platform;
}

function resolveAutoPlatform(): Platform {
  platformLogger.debug("Resolving platform automatically");

  const platformType = specificPlatformTypes.find((t) =>
    autoDetectablePlatforms[t].isSupported(),
  );

  if (!platformType) {
    throw new Error("Platform could not be resolved automatically.");
  }

  platformLogger.info(`Resolved platform: ${style.white.bold(platformType)}`);

  return autoDetectablePlatforms[platformType];
}
