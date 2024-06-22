import { z } from "zod";

import { specificPlatformTypes } from "../platform";

export const FreeformProperties = z.record(z.string(), z.string());

export const NightlyConfig = z.object({
  defaultBranches: z.array(z.string()).default([]),
  useChangeRequestIdentifier: z.boolean().default(true),
  prefixTpl: z.string().trim().default(""),
  suffixTpl: z.string().trim().default(""),
  branchIdentifierTpl: z.string().trim().default(""),
  commitIdentifierTpl: z.string().trim().default(""),
  versionTpl: z.string().trim().default(""),
});

export const TagsConfig = z.object({
  enabled: z.boolean().default(false),
  nightly: z.array(z.string().trim()).default([]),
  tagged: z.array(z.string().trim()).default([]),
  semVer: z.array(z.string().trim()).default([]),
});

export const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default([]),
  nightly: NightlyConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export const StrategyConfig = z.object({
  enabled: z.boolean().default(true),
  nightly: NightlyConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export type StrategyConfig = z.infer<typeof StrategyConfig>;

export const OutputConfig = z.object({
  type: z.enum(["env", "json"]).default("env"),
  env: z.object({
    prefix: z.string().default(""),
  }),
});

export const Config = z.object({
  defaults: DefaultConfig.default({}),
  platform: z.enum(["auto", ...specificPlatformTypes]).default("auto"),
  strategies: z.record(StrategyConfig),
  output: OutputConfig,
});

export type Config = z.infer<typeof Config>;
