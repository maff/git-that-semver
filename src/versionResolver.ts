import { getCommitDateTime } from "git";
import type { Platform } from "platform";
import semver from "semver";
import type { Config } from "./config";

type StrategyVersion = {
  version: string;
  [key: string]: string;
};

type VersionResult = {
  isNightlyVersion: boolean;
  isTaggedVersion: boolean;
  isSemVerVersion: boolean;
  isHighestSemVerVersion: boolean;
  isHighestSemVerReleaseVersion: boolean;
  strategies: {
    [key: string]: StrategyVersion;
  };
};

export const resolveVersion = (
  config: Config,
  platform: Platform
): VersionResult | null => {
  const tag = platform.getGitTag();

  if (tag) {
    return resolveTaggedVersion(config, platform, tag);
  } else {
    return resolveNightlyVersion(config, platform);
  }
};

const resolveTaggedVersion = (
  config: Config,
  platform: Platform,
  tag: string
): VersionResult => {
  const semVerVersion = semver.parse(tag);
  console.log("SEMVER VERSION", semVerVersion);

  // no semver tag -> tag is the version
  if (!semVerVersion) {
    return {
      isNightlyVersion: false,
      isTaggedVersion: true,
      isSemVerVersion: false,
      isHighestSemVerVersion: false,
      isHighestSemVerReleaseVersion: false,
      strategies: {
        dummy: {
          version: tag,
        },
      },
    };
  }

  // TODO
  return {
    isNightlyVersion: false,
    isTaggedVersion: true,
    isSemVerVersion: true,
    isHighestSemVerVersion: false,
    isHighestSemVerReleaseVersion: false,
    strategies: {
      dummy: {
        version: tag,
      },
    },
  };
};

const resolveNightlyVersion = (
  config: Config,
  platform: Platform
): VersionResult => {
  const commitSha = platform.getCommitSha();
  const commitRefName = platform.getCommitRefName();
  const commitDateTime = getCommitDateTime(commitSha);

  const identifier = `${commitDateTime}.${commitSha}`;

  // TODO use different strategies
  return {
    isNightlyVersion: true,
    isTaggedVersion: false,
    isSemVerVersion: false,
    isHighestSemVerVersion: false,
    isHighestSemVerReleaseVersion: false,
    strategies: {
      dummy: {
        version: identifier,
      },
    },
  };
};
