import type { SemVer } from "semver";
import type { VersionStrategyContext } from "version";
import type { StrategyVersion } from "versionResolver";
import { GenericStrategy } from "./genericStrategy";
import type { StrategyConfig } from "config";

export class ContainerStrategy extends GenericStrategy {
  constructor(public name: string, protected config: StrategyConfig) {
    super(name, config);
  }

  semVerVersionResult(
    context: VersionStrategyContext,
    version: SemVer
  ): StrategyVersion {
    const result = super.semVerVersionResult(context, version);

    // TODO add configuration to add other version tags (e.g. 1.2)
    const tags = [result.version];

    // TODO make this configurable
    if (context.versionInfo.isHighestSemVerReleaseVersion) {
      tags.push("latest");
    }

    return {
      ...result,
      tags,
    };
  }
}
