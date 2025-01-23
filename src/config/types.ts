import { z } from "zod";

import { specificPlatformTypes } from "../platform";

export const FreeformProperties = z.record(z.string(), z.string());

export const SnapshotConfig = z.object({
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
  snapshot: z.array(z.string().trim()).default([]),
  tagged: z.array(z.string().trim()).default([]),
  semVer: z.array(z.string().trim()).default([]),
});

export const DefaultConfig = z.object({
  branchPrefixes: z.array(z.string()).default([]),
  snapshot: SnapshotConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export const StrategyConfig = z.object({
  enabled: z.boolean().default(true),
  snapshot: SnapshotConfig.default({}),
  tags: TagsConfig.default({}),
  properties: FreeformProperties.default({}),
});

export type StrategyConfig = z.infer<typeof StrategyConfig>;

export const OutputConfig = z.object({
  type: z.enum(["env", "json", "yaml"]).default("env"),
  env: z.object({
    prefix: z.string().default(""),
    arrayDelimiter: z.string().default(" "),
  }),
  json: z
    .object({
      indent: z.number().optional(),
    })
    .optional(),
});

export const Config = z.object({
  defaults: DefaultConfig.default({}),
  platform: z.enum(["auto", ...specificPlatformTypes]).default("auto"),
  strategies: z.record(StrategyConfig),
  output: OutputConfig,
});

export type Config = z.infer<typeof Config>;
