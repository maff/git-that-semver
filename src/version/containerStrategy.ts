import type { SemVer } from "semver";
import type { VersionStrategyContext } from "version";
import type { CommitInfo, StrategyVersion } from "versionResolver";
import { GenericStrategy } from "./genericStrategy";
import type { StrategyConfig } from "config";

export class ContainerStrategy extends GenericStrategy {
  constructor(public name: string, protected config: StrategyConfig) {
    super(name, config);
  }

  taggedVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    tag: string
  ): StrategyVersion {
    const result = super.taggedVersionResult(context, commitInfo, tag);

    return {
      ...result,
      tags: [result.version],
    };
  }

  semVerVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    version: SemVer
  ): StrategyVersion {
    const result = super.semVerVersionResult(context, commitInfo, version);

    // TODO add configuration to add other version tags (e.g. 1.2)
    const tags = [result.version];

    // TODO make this configurable
    if (context.versionInfo.isHighestSemVerReleaseVersion) {
      tags.push("latest");
    }

    return {
      ...result,
      tags: tags,
    };
  }

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo
  ): StrategyVersion {
    const result = super.nightlyVersionResult(context, commitInfo);

    return {
      ...result,
      tags: [commitInfo.sha, result.version],
    };
  }
}
