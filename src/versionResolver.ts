import { getCommitDateTime, listTags } from "git";
import type { Platform } from "platform";
import semver, { SemVer } from "semver";
import type { Config } from "./config";

type StrategyVersion = {
  version: string;
  [key: string]: string;
};

type VersionResult = {
  isNightlyVersion: boolean;
  isTaggedVersion: boolean;
  isSemVerVersion: boolean;
  isReleaseSemVerVersion: boolean;
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

  // no semver tag -> tag is the version
  if (!semVerVersion) {
    return {
      isNightlyVersion: false,
      isTaggedVersion: true,
      isSemVerVersion: false,
      isReleaseSemVerVersion: false,
      isHighestSemVerVersion: false,
      isHighestSemVerReleaseVersion: false,
      strategies: {
        dummy: {
          version: tag,
        },
      },
    };
  }

  // release tag = no prerelease and no build info
  const isReleaseSemVerTag = (tag: SemVer) =>
    tag.prerelease.length === 0 && tag.build.length === 0;

  const isHighestTagInList = (tags: SemVer[]) =>
    tags.length == 0 || semVerVersion.compare(tags[0]) === 0;

  const semVerTags = listTags()
    .map((tag) => semver.parse(tag))
    .filter((tag): tag is SemVer => tag !== null)
    .sort(semver.compareBuild)
    .reverse();

  const releaseSemVerTags = semVerTags.filter((t) => isReleaseSemVerTag(t));

  // is it a release semver version?
  const isReleaseSemVerVersion = isReleaseSemVerTag(semVerVersion);

  // is it the highest semver tag in the repository?
  const isHighestSemVerVersion = isHighestTagInList(semVerTags);

  // is it the highest semver release tag in the repository?
  const isHighestSemVerReleaseVersion =
    isReleaseSemVerVersion && isHighestTagInList(releaseSemVerTags);

  // "clean" semver version (without prefix, but including the build part)
  let cleanSemVerVersion = semVerVersion.version;
  if (semVerVersion.build.length > 0) {
    cleanSemVerVersion += `+${semVerVersion.build.join(".")}`;
  }

  return {
    isNightlyVersion: false,
    isTaggedVersion: true,
    isSemVerVersion: true,
    isReleaseSemVerVersion,
    isHighestSemVerVersion,
    isHighestSemVerReleaseVersion,
    strategies: {
      dummy: {
        version: cleanSemVerVersion,
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
    isReleaseSemVerVersion: false,
    isHighestSemVerVersion: false,
    isHighestSemVerReleaseVersion: false,
    strategies: {
      dummy: {
        version: identifier,
      },
    },
  };
};
