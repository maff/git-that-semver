import { z } from "zod";
import log from "loglevel";
import YAML from "yaml";
import { merge } from "merge-anything";
import { specificPlatformTypes } from "../platform";
import defaultConfigFilePath from "./git-that-semver.default.yaml";

export const FreeformProperties = z.record(z.string(), z.string());

export const SupportedTypes = z.enum(["generic", "container"]);

export const NightlyConfig = z.object({
  defaultBranches: z.array(z.string()).default([]),
  prefixTpl: z.string().default(""),
  suffixTpl: z.string().default(""),
  branchIdentifierTpl: z.string().default(""),
  commitIdentifierTpl: z.string().default(""),
  versionTpl: z.string().default(""),
});

export const TagsConfig = z.object({
  enabled: z.boolean().default(false),
  nightly: z.array(z.string()).default([]),
  tagged: z.array(z.string()).default([]),
  semVer: z.array(z.string()).default([]),
});

export const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default([]),
  nightly: NightlyConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export const StrategyConfig = z.object({
  enabled: z.boolean().default(true),
  type: SupportedTypes.default("generic"),
  nightly: NightlyConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export type StrategyConfig = z.infer<typeof StrategyConfig>;

export const OutputConfig = z.object({
  prefix: z.string().default(""),
});

export const Config = z.object({
  defaults: DefaultConfig.default({}),
  platform: z.enum(["auto", ...specificPlatformTypes]).default("auto"),
  strategies: z.record(StrategyConfig),
  output: OutputConfig,
});

export type Config = z.infer<typeof Config>;

export const parseConfig = async (
  customConfigFilePath: string
): Promise<Config> => {
  const defaultConfig = YAML.parse(
    await Bun.file(defaultConfigFilePath).text()
  );
  log.trace("Default config", defaultConfig);

  let mergedConfig = defaultConfig;

  const customConfigFile = Bun.file(customConfigFilePath);
  if (await customConfigFile.exists()) {
    const customConfig = YAML.parse(await customConfigFile.text());
    log.trace("Custom config", customConfig);
    mergedConfig = merge(defaultConfig, customConfig);
  }

  log.trace("Merged config before strategy merge", mergedConfig);

  const defaultsWithoutBranchPrefixes = merge({}, mergedConfig.defaults ?? {});
  if (defaultsWithoutBranchPrefixes["branchPrefixes"]) {
    delete defaultsWithoutBranchPrefixes["branchPrefixes"];
  }

  if (mergedConfig.strategies) {
    for (const [strategy, strategyConfig] of Object.entries(
      mergedConfig.strategies
    )) {
      mergedConfig.strategies[strategy] = merge(
        defaultsWithoutBranchPrefixes,
        strategyConfig
      );
    }
  }

  log.trace("Merged config after strategy merge", mergedConfig);

  const config = Config.parse(mergedConfig);
  for (const [strategy, strategyConfig] of Object.entries(config.strategies)) {
    if (!strategyConfig.enabled) {
      delete config.strategies[strategy];
    }
  }

  log.debug("Final config", config);
  return Object.freeze(config);
};
