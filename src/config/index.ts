import { z } from "zod";
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

export const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default(["feature/", "bugfix/", "tech/"]),
  nightly: NightlyConfig.default({}),
  properties: FreeformProperties.default({}),
});

export const StrategyConfig = z.object({
  enabled: z.boolean().default(true),
  type: SupportedTypes.default("generic"),
  nightly: NightlyConfig.default({}),
  properties: FreeformProperties.default({}),
});

export type StrategyConfig = z.infer<typeof StrategyConfig>;

export const OutputConfig = z.object({
  prefix: z.string().default("GSR_"),
});

export const Config = z.object({
  defaults: DefaultConfig.default({}),
  platform: z.enum(["auto", ...specificPlatformTypes]).default("auto"),
  strategy: z.record(StrategyConfig),
  output: OutputConfig.default({}),
});

export type Config = z.infer<typeof Config>;

export const parseConfig = async (configFilePath: string): Promise<Config> => {
  const rawConfig = await import(configFilePath);
  const configFile = Config.parse(rawConfig);

  // merge with defaults
  // TODO can we do this in zod
  // TODO use filter/map instead of delete
  for (const [strategy, strategyConfig] of Object.entries(
    configFile.strategy
  )) {
    if (strategyConfig.enabled === false) {
      delete configFile.strategy[strategy];
    } else {
      configFile.strategy[strategy] = {
        ...strategyConfig,
        nightly: {
          ...configFile.defaults.nightly,
          ...strategyConfig.nightly,
        },
        properties: {
          ...configFile.defaults.properties,
          ...strategyConfig.properties,
        },
      };
    }
  }

  return Object.freeze(configFile);
};
