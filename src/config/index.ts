import { z } from "zod";
import log from "loglevel";
import { merge } from "merge-anything";
import { specificPlatformTypes } from "../platform";

export const FreeformProperties = z.record(z.string(), z.string());

export const SupportedTypes = z.enum(["generic", "container"]);

const defaultPrefixTpl = `{{ commitInfo.previousSemVerReleaseVersion | semver_inc: "minor" | append: "-" }}`;
const defaultBranchIdentifierTpl = `{% if branchIdentifier %}{{ branchIdentifier | truncate: 20, "" | trim_alphanumeric | append: "." }}{% endif %}`;
const defaultCommitIdentifierTpl = `{{ commitInfo.dateTime }}.{{ commitInfo.sha | truncate: 12, "" }}`;
const defaultVersionTpl = `{{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}`;

export const NightlyConfig = z.object({
  defaultBranches: z.array(z.string()).default(["main"]),
  prefixTpl: z.string().default(defaultPrefixTpl),
  suffixTpl: z.string().default(""),
  branchIdentifierTpl: z.string().default(defaultBranchIdentifierTpl),
  commitIdentifierTpl: z.string().default(defaultCommitIdentifierTpl),
  versionTpl: z.string().default(defaultVersionTpl),
});

export const TagsConfig = z.object({
  enabled: z.boolean().default(false),
  nightly: z.array(z.string()).default([]),
  tagged: z.array(z.string()).default([]),
  semVer: z.array(z.string()).default([]),
});

export const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default(["feature/", "bugfix/", "tech/"]),
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
  prefix: z.string().default("GTS_"),
});

export const Config = z.object({
  defaults: DefaultConfig.default({}),
  platform: z.enum(["auto", ...specificPlatformTypes]).default("auto"),
  strategy: z.record(StrategyConfig),
  output: OutputConfig.default({}),
});

export type Config = z.infer<typeof Config>;

export const parseConfig = async (configFilePath: string): Promise<Config> => {
  const defaultConfigRaw = await import("./git-that-semver.default.toml");
  const defaultConfig = Config.parse(defaultConfigRaw);
  log.debug("Default config", defaultConfig);

  let config: Config = defaultConfig;
  if (await Bun.file(configFilePath).exists()) {
    const customConfigRaw = await import(configFilePath);
    const customConfig = Config.parse(customConfigRaw);
    log.debug("Custom config", customConfig);

    config = merge(defaultConfig, customConfig);
  }

  log.trace("Merged config before strategy merge", config);
  for (const [strategy, strategyConfig] of Object.entries(config.strategy)) {
    if (strategyConfig.enabled === false) {
      delete config.strategy[strategy];
    } else {
      config.strategy[strategy] = {
        ...strategyConfig,
        nightly: merge(config.defaults.nightly, strategyConfig.nightly),
        tags: merge(config.defaults.tags, strategyConfig.tags),
        properties: merge(
          config.defaults.properties,
          strategyConfig.properties
        ),
      };
    }
  }

  log.debug("Resolved config", config);
  return Object.freeze(config);
};
