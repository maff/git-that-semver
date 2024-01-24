import { getCommitDateTime, listTags, listTagsBeforeCommit } from "util/git";
import type { Platform } from "platform";
import semver, { SemVer } from "semver";
import type { Config } from "./config";
import slug from "slug";
import type { VersionStrategy } from "version";
import { cleanSemVerVersionString } from "util/semVer";

export type StrategyVersion = {
  version: string;
  [key: string]: string;
};

export type VersionInfo = {
  isNightlyVersion: boolean;
  isTaggedVersion: boolean;
  isSemVerVersion: boolean;
  isReleaseSemVerVersion: boolean;
  isHighestSemVerVersion: boolean;
  isHighestSemVerReleaseVersion: boolean;
};

export type PreviousSemVerVersions = {
  previousSemVerVersion: string;
  previousSemVerReleaseVersion: string;
};

export type VersionResult = VersionInfo & {
  strategies: {
    [key: string]: StrategyVersion;
  };
};

export const resolveVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[]
): VersionResult => {
  const tag = platform.getGitTag();

  if (tag) {
    return resolveTaggedVersion(config, platform, strategies, tag);
  } else {
    return resolveNightlyVersion(config, platform, strategies);
  }
};

const resolveTaggedVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[],
  tag: string
): VersionResult => {
  const version = semver.parse(tag);

  // no semver tag -> tag is the version
  if (!version) {
    const versionInfo = {
      isNightlyVersion: false,
      isTaggedVersion: true,
      isSemVerVersion: false,
      isReleaseSemVerVersion: false,
      isHighestSemVerVersion: false,
      isHighestSemVerReleaseVersion: false,
    };

    return {
      ...versionInfo,
      strategies: Object.fromEntries(
        strategies.map((strategy) => [
          strategy.name,
          strategy.taggedVersionResult({ config, platform, versionInfo }, tag),
        ])
      ),
    };
  }

  const isHighestTagInList = (tags: SemVer[]) =>
    tags.length == 0 || version.compare(tags[0]) === 0;

  const semVerTags = listTags()
    .map((tag) => semver.parse(tag))
    .filter((tag): tag is SemVer => tag !== null)
    .sort(semver.compareBuild)
    .reverse();

  const releaseSemVerTags = semVerTags.filter((t) => isReleaseSemVerTag(t));

  // is it a release semver version?
  const isReleaseSemVerVersion = isReleaseSemVerTag(version);

  // is it the highest semver tag in the repository?
  const isHighestSemVerVersion = isHighestTagInList(semVerTags);

  // is it the highest semver release tag in the repository?
  const isHighestSemVerReleaseVersion =
    isReleaseSemVerVersion && isHighestTagInList(releaseSemVerTags);

  const versionInfo = {
    isNightlyVersion: false,
    isTaggedVersion: true,
    isSemVerVersion: true,
    isReleaseSemVerVersion,
    isHighestSemVerVersion,
    isHighestSemVerReleaseVersion,
  };

  return {
    ...versionInfo,
    strategies: Object.fromEntries(
      strategies.map((strategy) => [
        strategy.name,
        strategy.semVerVersionResult(
          { config, platform, versionInfo },
          version
        ),
      ])
    ),
  };
};

export type CommitInfo = {
  sha: string;
  refName: string;
  refNameSlug: string;
  dateTime: string;
} & PreviousSemVerVersions;

const resolveNightlyVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[]
): VersionResult => {
  const commitSha = platform.getCommitSha();
  const commitRefName = platform.getCommitRefName();
  const previousSemVerVersions = findPreviousSemVerVersions(commitSha);

  const commitInfo: CommitInfo = {
    sha: commitSha,
    refName: commitRefName,
    refNameSlug: resolveRefSlugName(config, commitRefName),
    dateTime: getCommitDateTime(commitSha),
    ...previousSemVerVersions,
  };

  const versionInfo = {
    isNightlyVersion: true,
    isTaggedVersion: false,
    isSemVerVersion: false,
    isReleaseSemVerVersion: false,
    isHighestSemVerVersion: false,
    isHighestSemVerReleaseVersion: false,
  };

  return {
    ...versionInfo,
    strategies: Object.fromEntries(
      strategies.map((strategy) => [
        strategy.name,
        strategy.nightlyVersionResult(
          { config, platform, versionInfo },
          commitInfo
        ),
      ])
    ),
  };
};

const resolveRefSlugName = (config: Config, refName: string) => {
  let slugRefName = refName;
  for (const prefix of config.defaults.branchPrefixes) {
    if (slugRefName.startsWith(prefix)) {
      slugRefName = slugRefName.substring(prefix.length);
      break;
    }
  }

  return slug(slugRefName, { lower: true, trim: true });
};

// release tag = no prerelease and no build info
const isReleaseSemVerTag = (tag: SemVer) =>
  tag.prerelease.length === 0 && tag.build.length === 0;

// find previous semver version tags in the repository
const findPreviousSemVerVersions = (commitSha: string) => {
  const previousSemVerTags = listTagsBeforeCommit(commitSha)
    .map((tag) => semver.parse(tag))
    .filter((tag): tag is SemVer => tag !== null)
    .sort(semver.compareBuild)
    .reverse();

  const releaseSemVerTags = previousSemVerTags.filter((t) =>
    isReleaseSemVerTag(t)
  );

  return {
    previousSemVerVersion:
      previousSemVerTags.length > 0
        ? cleanSemVerVersionString(previousSemVerTags[0])
        : "0.0.0",
    previousSemVerReleaseVersion:
      releaseSemVerTags.length > 0
        ? cleanSemVerVersionString(releaseSemVerTags[0])
        : "0.0.0",
  };
};
