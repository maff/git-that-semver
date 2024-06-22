import type { Config } from "../config/types";
import type { VersionResult } from "../versionResolver";
import { EnvOutputPrinter } from "./env";
import { JsonOutputPrinter } from "./json";

export interface OutputPrinter {
  printResult(config: Config, versionResult: VersionResult): void;
}

export function resolveOutputPrinter(config: Config): OutputPrinter {
  switch (config.output.type) {
    case "env":
      return new EnvOutputPrinter();
    case "json":
      return new JsonOutputPrinter();
  }
}
