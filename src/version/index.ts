import type { Config, StrategyConfig } from "config/types";
import type { Platform } from "platform";
import type { SemVer } from "semver";
import type { CommitInfo, VersionInfo, StrategyVersion } from "versionResolver";
import { GenericStrategy } from "./genericStrategy";
import { ContainerStrategy } from "./containerStrategy";

export type VersionStrategyContext = {
  config: Config;
  platform: Platform;
  versionInfo: VersionInfo;
};

export interface VersionStrategy {
  name: string;

  taggedVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    tag: string
  ): StrategyVersion;

  semVerVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    version: SemVer
  ): StrategyVersion;

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo
  ): StrategyVersion;
}

export function resolveStrategies(strategies: {
  [key: string]: StrategyConfig;
}): VersionStrategy[] {
  return Object.entries(strategies)
    .filter(([name, strategyConfig]) => strategyConfig.enabled)
    .map(([name, strategyConfig]) => {
      switch (strategyConfig.type) {
        case "generic":
          return new GenericStrategy(name, strategyConfig);
        case "container":
          return new ContainerStrategy(name, strategyConfig);
      }
    });
}
