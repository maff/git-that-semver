import YAML from "yaml";

import type { OutputPrinter } from ".";
import type { Config } from "../config/types";
import type { VersionResult } from "../versionResolver";

export class YamlOutputPrinter implements OutputPrinter {
  printResult(_config: Config, versionResult: VersionResult) {
    console.log(YAML.stringify(versionResult));
  }
}
