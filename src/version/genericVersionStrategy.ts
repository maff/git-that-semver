import type { SemVer } from "semver";
import type { StrategyConfig } from "../config/types";
import { templateEngine } from "../tpl/templateEngine";
import { semVerVersionString } from "../util/semVer";
import type { VersionStrategy, VersionStrategyContext } from "../version";
import type { CommitInfo, StrategyVersion } from "../versionResolver";

export class GenericVersionStrategy implements VersionStrategy {
  constructor(
    public name: string,
    protected config: StrategyConfig,
  ) {}

  taggedVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    tag: string,
  ): StrategyVersion {
    return {
      version: tag,
      tags: this.uniqueTags(this.config.tags.tagged, {
        ...this.templateContext(context, commitInfo),
        version: tag,
      }),
      ...this.config.properties,
    };
  }

  semVerVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    version: SemVer,
  ): StrategyVersion {
    const stringVersion = semVerVersionString(version);

    return {
      version: stringVersion,
      tags: this.uniqueTags(this.config.tags.semVer, {
        ...this.templateContext(context, commitInfo),
        version: stringVersion,
        semVer: version,
      }),
      ...this.config.properties,
    };
  }

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
  ): StrategyVersion {
    const templateContext = this.templateContext(context, commitInfo);

    const prefix = templateEngine.parseAndRenderSync(
      this.config.nightly.prefixTpl,
      templateContext,
    );

    const suffix = templateEngine.parseAndRenderSync(
      this.config.nightly.suffixTpl,
      templateContext,
    );

    const branchIdentifier = templateEngine.parseAndRenderSync(
      this.config.nightly.branchIdentifierTpl,
      {
        ...templateContext,
        branchIdentifier: this.config.nightly.defaultBranches.includes(
          commitInfo.refName,
        )
          ? undefined
          : commitInfo.refNameSlug,
      },
    );

    const commitIdentifier = templateEngine.parseAndRenderSync(
      this.config.nightly.commitIdentifierTpl,
      templateContext,
    );

    const version = templateEngine.parseAndRenderSync(
      this.config.nightly.versionTpl,
      {
        ...templateContext,
        prefix,
        suffix,
        branchIdentifier,
        commitIdentifier,
      },
    );

    return {
      version: version,
      tags: this.uniqueTags(this.config.tags.nightly, {
        ...templateContext,
        version,
      }),
      ...this.config.properties,
    };
  }

  private templateContext(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
  ) {
    return {
      config: this.config,
      commitInfo,
      versionInfo: context.versionInfo,
      env: process.env,
    };
  }

  private uniqueTags(templates: string[], context: any) {
    if (!this.config.tags.enabled) {
      return [];
    }

    const tags = templates
      .map((tagTpl) => templateEngine.parseAndRenderSync(tagTpl, context))
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    return [...new Set(tags)];
  }
}
