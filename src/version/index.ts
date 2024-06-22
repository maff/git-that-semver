import type { SemVer } from "semver";
import type { Config, StrategyConfig } from "../config/types";
import type { Platform } from "../platform";
import type {
  CommitInfo,
  StrategyVersion,
  VersionInfo,
} from "../versionResolver";
import { GenericVersionStrategy } from "./genericVersionStrategy";

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
    tag: string,
  ): StrategyVersion;

  semVerVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
    version: SemVer,
  ): StrategyVersion;

  nightlyVersionResult(
    context: VersionStrategyContext,
    commitInfo: CommitInfo,
  ): StrategyVersion;
}

export function resolveStrategies(strategies: {
  [key: string]: StrategyConfig;
}): VersionStrategy[] {
  return Object.entries(strategies)
    .filter(([_, strategyConfig]) => strategyConfig.enabled)
    .map(
      ([name, strategyConfig]) =>
        new GenericVersionStrategy(name, strategyConfig),
    );
}
