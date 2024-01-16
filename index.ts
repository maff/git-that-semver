import util from "util";
import { z } from "zod";

console.log("Hello via Bun!");
console.log(Bun.argv);
console.log(Bun.argv[2]);

const toml = await import(Bun.argv[2]);
console.log(util.inspect(toml, false, null, true));

const FreeformProperties = z.record(z.string(), z.string());

const SupportedTypes = z.enum(["generic", "container"]);

const NightlyConfig = z.object({
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  maxLength: z.number().int().optional(),
});

const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default(["feature/", "bugfix/", "tech/"]),
  nightly: NightlyConfig.default({}),
  properties: FreeformProperties.default({}),
});

const StrategyConfig = z.object({
  enabled: z.boolean().default(true),
  type: SupportedTypes.default("generic"),
  nightly: NightlyConfig.default({}),
  properties: FreeformProperties.default({}),
});

const ConfigFile = z.object({
  defaults: DefaultConfig,
  strategy: z.record(StrategyConfig),
});

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
