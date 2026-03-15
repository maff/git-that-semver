import { style, logger } from "../logging";
import { GitPlatform } from "./git";
import { GitHubPlatform } from "./github";
import { GitLabPlatform } from "./gitlab";
import { ManualPlatform, type ManualPlatformOptions } from "./manual";

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
      platformLogger.info(
        `Resolved platform: ${style.white.bold("manual")} (manual options provided)`,
      );
      return new ManualPlatform(manualOpts);
    }
    return resolveAutoPlatform();
  }

  if (platformType === "git") {
    platformLogger.info(`Resolved platform: ${style.white.bold("git")}`);
    return new GitPlatform();
  }

  if (platformType === "manual") {
    if (!manualOpts) {
      throw new Error(
        "Manual platform requires --commit-sha and --ref-name (or GTS_COMMIT_SHA and GTS_REF_NAME)",
      );
    }
    platformLogger.info(`Resolved platform: ${style.white.bold("manual")}`);
    return new ManualPlatform(manualOpts);
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
