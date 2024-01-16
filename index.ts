import { ConfigFile } from "config";
import util from "util";

console.log("Hello via Bun!");
console.log(Bun.argv);
console.log(Bun.argv[2]);

const toml = await import(Bun.argv[2]);
console.log(util.inspect(toml, false, null, true));

const parsed = ConfigFile.parse(toml);
console.log(util.inspect(parsed, false, null, true));

console.log(Object.keys(parsed.strategy));

// iterate strategies
for (const [strategy, strategyConfig] of Object.entries(parsed.strategy)) {
  console.log(strategy);
  console.log(strategyConfig);

  parsed.strategy[strategy] = {
    ...strategyConfig,
    nightly: {
      ...parsed.defaults.nightly,
      ...strategyConfig.nightly,
    },
    properties: {
      ...parsed.defaults.properties,
      ...strategyConfig.properties,
    },
  };
}

console.log(util.inspect(parsed, false, null, true));
