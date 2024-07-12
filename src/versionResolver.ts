import semver, { SemVer } from "semver";
import slug from "slug";

import type { Config } from "./config/types";
import { logger } from "./logging";
import type { Platform } from "./platform";
import { getCommitDateTime, listTags, listTagsBeforeCommit } from "./util/git";
import { semVerVersionString } from "./util/semVer";
import type { VersionStrategy } from "./version";

const versionResolveLogger = logger.childLogger("version-resolver");

export type StrategyVersion = {
  version: string;
  tags: string[];
  [key: string]: string | string[];
};

export type VersionInfo = {
  isSnapshotVersion: boolean;
  isTaggedVersion: boolean;
  isSemVerVersion: boolean;
  isReleaseSemVerVersion: boolean;
  isHighestSemVerVersion: boolean;
  isHighestSemVerReleaseVersion: boolean;
  isHighestSameMajorReleaseVersion: boolean;
  isHighestSameMinorReleaseVersion: boolean;
};

export type PreviousSemVerVersions = {
  previousSemVerVersion: string;
  previousSemVerReleaseVersion: string;
};

export type CommitInfo = {
  sha: string;
  refName: string;
  refNameSlug: string;
  changeRequestIdentifier: string | undefined;
  tag: string | undefined;
  dateTime: string;
} & PreviousSemVerVersions;

export type VersionResult = VersionInfo & {
  strategies: {
    [key: string]: StrategyVersion;
  };
};

export const resolveVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[],
): VersionResult => {
  const commitInfo = fetchCommitInfo(config, platform);
  versionResolveLogger.debug("Commit info: ", commitInfo);

  if (commitInfo.tag) {
    return resolveTaggedVersion(
      config,
      platform,
      strategies,
      commitInfo,
      commitInfo.tag,
    );
  } else {
    return resolveSnapshotVersion(config, platform, strategies, commitInfo);
  }
};

const fetchCommitInfo = (config: Config, platform: Platform): CommitInfo => {
  const commitSha = platform.getCommitSha();
  const commitRefName = platform.getCommitRefName();
  const changeRequestIdentifier = platform.getChangeRequestIdentifier();
  const tag = platform.getGitTag();
  const previousSemVerVersions = findPreviousSemVerVersions(commitSha);

  return {
    sha: commitSha,
    refName: commitRefName,
    refNameSlug: resolveRefSlugName(config, commitRefName),
    changeRequestIdentifier,
    tag,
    dateTime: getCommitDateTime(commitSha),
    ...previousSemVerVersions,
  };
};

const resolveTaggedVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[],
  commitInfo: CommitInfo,
  tag: string,
): VersionResult => {
  const version = semver.parse(tag);

  // no semver tag -> tag is the version
  if (!version) {
    const versionInfo: VersionInfo = {
      isSnapshotVersion: false,
      isTaggedVersion: true,
      isSemVerVersion: false,
      isReleaseSemVerVersion: false,
      isHighestSemVerVersion: false,
      isHighestSemVerReleaseVersion: false,
      isHighestSameMajorReleaseVersion: false,
      isHighestSameMinorReleaseVersion: false,
    };

    return {
      ...versionInfo,
      strategies: Object.fromEntries(
        strategies.map((strategy) => [
          strategy.name,
          strategy.taggedVersionResult(
            { config, platform, versionInfo },
            commitInfo,
            tag,
          ),
        ]),
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

  // is it a release semver version?
  const isReleaseSemVerVersion = isReleaseSemVerTag(version);

  // is it the highest semver tag in the repository?
  const isHighestSemVerVersion = isHighestTagInList(semVerTags);

  // is it the highest semver release tag in the repository?
  const isHighestSemVerReleaseVersion =
    isReleaseSemVerVersion &&
    isHighestTagInList(semVerTags.filter((t) => isReleaseSemVerTag(t)));

  // is it the highest same major semver tag in the repository?
  const isHighestSameMajorReleaseVersion =
    isReleaseSemVerVersion &&
    isHighestTagInList(semVerTags.filter((t) => t.major === version.major));

  // is it the highest same minor semver tag in the repository?
  const isHighestSameMinorReleaseVersion =
    isReleaseSemVerVersion &&
    isHighestTagInList(
      semVerTags.filter(
        (t) => t.major == version.major && t.minor === version.minor,
      ),
    );

  const versionInfo: VersionInfo = {
    isSnapshotVersion: false,
    isTaggedVersion: true,
    isSemVerVersion: true,
    isReleaseSemVerVersion,
    isHighestSemVerVersion,
    isHighestSemVerReleaseVersion,
    isHighestSameMajorReleaseVersion,
    isHighestSameMinorReleaseVersion,
  };

  return {
    ...versionInfo,
    strategies: Object.fromEntries(
      strategies.map((strategy) => [
        strategy.name,
        strategy.semVerVersionResult(
          { config, platform, versionInfo },
          commitInfo,
          version,
        ),
      ]),
    ),
  };
};

const resolveSnapshotVersion = (
  config: Config,
  platform: Platform,
  strategies: VersionStrategy[],
  commitInfo: CommitInfo,
): VersionResult => {
  const versionInfo: VersionInfo = {
    isSnapshotVersion: true,
    isTaggedVersion: false,
    isSemVerVersion: false,
    isReleaseSemVerVersion: false,
    isHighestSemVerVersion: false,
    isHighestSemVerReleaseVersion: false,
    isHighestSameMajorReleaseVersion: false,
    isHighestSameMinorReleaseVersion: false,
  };

  return {
    ...versionInfo,
    strategies: Object.fromEntries(
      strategies.map((strategy) => [
        strategy.name,
        strategy.snapshotVersionResult(
          { config, platform, versionInfo },
          commitInfo,
        ),
      ]),
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
const findPreviousSemVerVersions = (
  commitSha: string,
): PreviousSemVerVersions => {
  const previousSemVerTags = listTagsBeforeCommit(commitSha)
    .map((tag) => semver.parse(tag))
    .filter((tag): tag is SemVer => tag !== null)
    .sort(semver.compareBuild)
    .reverse();

  const releaseSemVerTags = previousSemVerTags.filter((t) =>
    isReleaseSemVerTag(t),
  );

  return {
    previousSemVerVersion:
      previousSemVerTags.length > 0
        ? semVerVersionString(previousSemVerTags[0])
        : "0.0.0",
    previousSemVerReleaseVersion:
      releaseSemVerTags.length > 0
        ? semVerVersionString(releaseSemVerTags[0])
        : "0.0.0",
  };
};
