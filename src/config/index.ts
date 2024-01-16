import { z } from "zod";
import { adapterTypes } from "../platforms";

export const FreeformProperties = z.record(z.string(), z.string());

export const SupportedTypes = z.enum(["generic", "container"]);

export const NightlyConfig = z.object({
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  maxLength: z.number().int().optional(),
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

export const ConfigFile = z.object({
  defaults: DefaultConfig,
  scmAdapter: z.enum(["auto", ...adapterTypes]).default("auto"),
  strategy: z.record(StrategyConfig),
});
