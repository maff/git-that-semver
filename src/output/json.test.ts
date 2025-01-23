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

  const testPrintResult = (
    description: string,
    versionResult: any,
    indent: number = 2,
  ) => {
    it(`should print ${description} as formatted JSON with indent ${indent}`, () => {
      const config = {
        output: {
          json: {
            indent,
          },
        },
      } as Config;

      printer.printResult(config, versionResult);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(versionResult, null, indent),
      );

      const printedJson = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(printedJson).toEqual(versionResult);
    });
  };

  describe("with default indent (2)", () => {
    testPrintResult("release version result", releaseVersionResult);
    testPrintResult("snapshot version result", snapshotVersionResult);
  });

  describe("with custom indent", () => {
    testPrintResult(
      "release version result with no indent",
      releaseVersionResult,
      0,
    );
    testPrintResult(
      "snapshot version result with no indent",
      snapshotVersionResult,
      0,
    );
    testPrintResult(
      "release version result with indent 4",
      releaseVersionResult,
      4,
    );
    testPrintResult(
      "snapshot version result with indent 4",
      snapshotVersionResult,
      4,
    );
  });
});
