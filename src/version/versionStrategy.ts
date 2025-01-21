import type { SemVer } from "semver";

import type { Config, StrategyConfig } from "../config/types";
import type { Platform } from "../platform";
import { templateEngine } from "../tpl/templateEngine";
import { semVerVersionString } from "../util/semVer";
import type {
  CommitInfo,
  StrategyVersion,
  VersionInfo,
} from "./versionResolver";

export type VersionStrategyContext = {
  config: Config;
  platform: Platform;
  versionInfo: VersionInfo;
};

export class VersionStrategy {
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

  snapshotVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
  ): StrategyVersion {
    const templateContext = this.templateContext(context, commitInfo);

    const prefix = templateEngine.parseAndRenderSync(
      this.config.snapshot.prefixTpl,
      templateContext,
    );

    const suffix = templateEngine.parseAndRenderSync(
      this.config.snapshot.suffixTpl,
      templateContext,
    );

    const branchIdentifier = templateEngine.parseAndRenderSync(
      this.config.snapshot.branchIdentifierTpl,
      {
        ...templateContext,
        branchIdentifier: this.config.snapshot.defaultBranches.includes(
          commitInfo.refName,
        )
          ? undefined
          : commitInfo.refNameSlug,
      },
    );

    const commitIdentifier = templateEngine.parseAndRenderSync(
      this.config.snapshot.commitIdentifierTpl,
      templateContext,
    );

    const version = templateEngine.parseAndRenderSync(
      this.config.snapshot.versionTpl,
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
      tags: this.uniqueTags(this.config.tags.snapshot, {
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

export function resolveStrategies(strategies: {
  [key: string]: StrategyConfig;
}): VersionStrategy[] {
  return Object.entries(strategies)
    .filter(([_, strategyConfig]) => strategyConfig.enabled)
    .map(([name, strategyConfig]) => new VersionStrategy(name, strategyConfig));
}
