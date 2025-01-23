import { merge } from "merge-anything";
import YAML from "yaml";

import { logger } from "../logging";
import { applyConfigOverrides } from "../util/config";
import defaultConfigContents from "./git-that-semver.default.yaml" with { type: "text" };
import { Config } from "./types";

const configLogger = logger.childLogger("config");

export const resolveConfig = async (
  customConfigFilePath: string,
  enabledStrategies: string[],
  disabledStrategies: string[],
  outputFormat: string | undefined,
  configOverrides: string[] = [],
): Promise<Config> => {
  const defaultConfig = YAML.parse(defaultConfigContents);
  configLogger.trace("Default config", defaultConfig);

  let mergedConfig = defaultConfig;

  const customConfigFile = Bun.file(customConfigFilePath);
  if (await customConfigFile.exists()) {
    const customConfig = YAML.parse(await customConfigFile.text());
    configLogger.trace("Custom config", customConfig);
    mergedConfig = merge(defaultConfig, customConfig);
  }

  configLogger.trace(
    "Merged config before enabled/disabled strategy handling",
    { enabledStrategies, disabledStrategies },
    mergedConfig,
  );

  const enabledStrategyConfig = createShallowStrategiesWithState(
    enabledStrategies,
    true,
  );
  const disabledStrategyConfig = createShallowStrategiesWithState(
    disabledStrategies,
    false,
  );
  mergedConfig = merge(
    mergedConfig,
    { strategies: enabledStrategyConfig },
    { strategies: disabledStrategyConfig },
  );

  if (outputFormat) {
    mergedConfig = merge(mergedConfig, { output: { type: outputFormat } });
  }

  if (configOverrides.length > 0) {
    mergedConfig = applyConfigOverrides(mergedConfig, configOverrides);
    configLogger.trace("Config after applying overrides", mergedConfig);
  }

  configLogger.trace("Merged config before strategy merge", mergedConfig);

  const defaultsWithoutBranchPrefixes = merge({}, mergedConfig.defaults ?? {});
  if (defaultsWithoutBranchPrefixes["branchPrefixes"]) {
    delete defaultsWithoutBranchPrefixes["branchPrefixes"];
  }

  if (mergedConfig.strategies) {
    for (const [strategy, strategyConfig] of Object.entries(
      mergedConfig.strategies,
    )) {
      mergedConfig.strategies[strategy] = merge(
        defaultsWithoutBranchPrefixes,
        strategyConfig,
      );
    }
  }

  configLogger.trace("Merged config after strategy merge", mergedConfig);

  const config = Config.parse(mergedConfig);
  for (const [strategy, strategyConfig] of Object.entries(config.strategies)) {
    if (!strategyConfig.enabled) {
      delete config.strategies[strategy];
    }
  }

  configLogger.debug("Final config", config);
  return Object.freeze(config);
};

const createShallowStrategiesWithState = (
  strategies: string[],
  state: boolean,
): ShallowStrategies => {
  const result: ShallowStrategies = {};
  for (const strategy of strategies) {
    result[strategy] = { enabled: state };
  }

  return result;
};

type ShallowStrategies = {
  [key: string]: { enabled: boolean };
};
