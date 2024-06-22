import log from "loglevel";
import { merge } from "merge-anything";
import YAML from "yaml";

import defaultConfigContents from "./git-that-semver.default.yaml" assert { type: "text" };
import { Config } from "./types";

export const resolveConfig = async (
  customConfigFilePath: string,
  enabledStrategies: string[],
  disabledStrategies: string[],
): Promise<Config> => {
  const defaultConfig = YAML.parse(defaultConfigContents);
  log.trace("Default config", defaultConfig);

  let mergedConfig = defaultConfig;

  const customConfigFile = Bun.file(customConfigFilePath);
  if (await customConfigFile.exists()) {
    const customConfig = YAML.parse(await customConfigFile.text());
    log.trace("Custom config", customConfig);
    mergedConfig = merge(defaultConfig, customConfig);
  }

  log.trace(
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

  log.trace("Merged config before strategy merge", mergedConfig);

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
