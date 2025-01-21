import { describe, expect, it, spyOn, beforeEach, afterEach } from "bun:test";

import { Config } from "../config/types";
import {
  releaseVersionResult,
  snapshotVersionResult,
} from "./__fixtures__/versionResults";
import { JsonOutputPrinter } from "./json";

describe("JsonOutputPrinter", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let printer: JsonOutputPrinter;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log");
    printer = new JsonOutputPrinter();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const testPrintResult = (description: string, versionResult: any) => {
    it(`should print ${description} as formatted JSON`, () => {
      printer.printResult({} as Config, versionResult);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(versionResult, null, 2),
      );

      const printedJson = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(printedJson).toEqual(versionResult);
    });
  };

  testPrintResult("release version result", releaseVersionResult);
  testPrintResult("snapshot version result", snapshotVersionResult);
});
