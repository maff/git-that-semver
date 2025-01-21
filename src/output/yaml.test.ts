import { describe, expect, it, spyOn, beforeEach, afterEach } from "bun:test";
import YAML from "yaml";

import { Config } from "../config/types";
import {
  releaseVersionResult,
  snapshotVersionResult,
} from "./__fixtures__/versionResults";
import { YamlOutputPrinter } from "./yaml";

describe("YamlOutputPrinter", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let printer: YamlOutputPrinter;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log");
    printer = new YamlOutputPrinter();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const testPrintResult = (description: string, versionResult: any) => {
    it(`should print ${description} as YAML`, () => {
      printer.printResult({} as Config, versionResult);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(YAML.stringify(versionResult));

      const printedYaml = YAML.parse(consoleSpy.mock.calls[0][0]);
      expect(printedYaml).toEqual(versionResult);
    });
  };

  testPrintResult("release version result", releaseVersionResult);
  testPrintResult("snapshot version result", snapshotVersionResult);
});
