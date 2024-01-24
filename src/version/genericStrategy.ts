import type { StrategyConfig } from "config";
import { Liquid } from "liquidjs";
import type { SemVer } from "semver";
import { templateEngine } from "tpl/templateEngine";
import { semVerVersionString } from "util/semVer";
import type { VersionStrategy, VersionStrategyContext } from "version";
import type { CommitInfo, StrategyVersion } from "versionResolver";

export class GenericStrategy implements VersionStrategy {
  constructor(public name: string, protected config: StrategyConfig) {}

  taggedVersionResult(
    context: VersionStrategyContext,
    tag: string
  ): StrategyVersion {
    return {
      version: tag,
    };
  }

  semVerVersionResult(
    context: VersionStrategyContext,
    version: SemVer
  ): StrategyVersion {
    return {
      version: semVerVersionString(version),
    };
  }

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo
  ): StrategyVersion {
    const templateContext = {
      config: this.config,
      commitInfo,
    };

    const prefix = templateEngine.parseAndRenderSync(
      this.config.nightly.prefixTpl,
      templateContext
    );

    const suffix = templateEngine.parseAndRenderSync(
      this.config.nightly.suffixTpl,
      templateContext
    );

    const branchIdentifier = templateEngine.parseAndRenderSync(
      this.config.nightly.branchIdentifierTpl,
      {
        ...templateContext,
        branchIdentifier: this.config.nightly.defaultBranches.includes(
          commitInfo.refName
        )
          ? undefined
          : commitInfo.refNameSlug,
      }
    );

    const commitIdentifier = templateEngine.parseAndRenderSync(
      this.config.nightly.commitIdentifierTpl,
      templateContext
    );

    const version = templateEngine.parseAndRenderSync(
      this.config.nightly.versionTpl,
      {
        ...templateContext,
        prefix,
        suffix,
        branchIdentifier,
        commitIdentifier,
      }
    );

    return {
      version: version,
    };
  }
}
