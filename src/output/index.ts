import type { Config } from "../config/types";
import type { VersionResult } from "../version/versionResolver";
import { EnvOutputPrinter } from "./env";
import { JsonOutputPrinter } from "./json";
import { YamlOutputPrinter } from "./yaml";

export interface OutputPrinter {
  printResult(config: Config, versionResult: VersionResult): void;
}

export function resolveOutputPrinter(config: Config): OutputPrinter {
  switch (config.output.type) {
    case "env":
      return new EnvOutputPrinter();
    case "json":
      return new JsonOutputPrinter();
    case "yaml":
      return new YamlOutputPrinter();
  }
}
