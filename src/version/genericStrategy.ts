import type { StrategyConfig } from "config";
import { Liquid } from "liquidjs";
import type { SemVer } from "semver";
import { cleanSemVerVersionString } from "util/semVer";
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
      version: cleanSemVerVersionString(version),
    };
  }

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo
  ): StrategyVersion {
    const tplEngine = new Liquid();

    // only allow alphanumeric characters at start and end
    tplEngine.registerFilter("trim_alphanumeric", (v) =>
      v.replace(/^[^a-zA-Z0-9]/g, "").replace(/[^a-zA-Z0-9]$/g, "")
    );

    const tplContext = {
      config: this.config,
      commitInfo,
    };

    const branchIdentifier = tplEngine.parseAndRenderSync(
      this.config.nightly.branchIdentifierTpl,
      {
        ...tplContext,
        branchIdentifier: this.config.nightly.defaultBranches.includes(
          commitInfo.refName
        )
          ? undefined
          : commitInfo.refNameSlug,
      }
    );

    const commitIdentifier = tplEngine.parseAndRenderSync(
      this.config.nightly.commitIdentifierTpl,
      tplContext
    );

    const version = tplEngine.parseAndRenderSync(
      this.config.nightly.versionTpl,
      {
        ...tplContext,
        branchIdentifier,
        commitIdentifier,
      }
    );

    // TODO remove
    console.log({
      version,
      tplContext,
      branchIdentifier,
      commitIdentifier,
      commitInfo,
    });

    return {
      version: version,
    };
  }
}
