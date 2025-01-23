import type { OutputPrinter } from ".";
import type { Config } from "../config/types";
import type { VersionResult } from "../version/versionResolver";

export class JsonOutputPrinter implements OutputPrinter {
  printResult(config: Config, versionResult: VersionResult) {
    console.log(
      JSON.stringify(versionResult, null, config.output.json?.indent),
    );
  }
}
