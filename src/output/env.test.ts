import { describe, expect, it, spyOn, beforeEach, afterEach } from "bun:test";

import { Config } from "../config/types";
import {
  releaseVersionResult,
  snapshotVersionResult,
} from "./__fixtures__/versionResults";
import { EnvOutputPrinter } from "./env";

describe("EnvOutputPrinter", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let printer: EnvOutputPrinter;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log");
    printer = new EnvOutputPrinter();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const testPrintResult = (
    description: string,
    versionResult: any,
    expectedOutput: string[],
    prefix = "GTS_",
  ) => {
    it(`should print ${description} as env vars`, () => {
      const config = {
        output: {
          type: "env",
          env: {
            prefix,
            arrayDelimiter: " ",
            quoteArrays: false,
          },
        },
      } as Config;

      printer.printResult(config, versionResult);

      expect(consoleSpy).toHaveBeenCalledTimes(expectedOutput.length);
      expectedOutput.forEach((line, index) => {
        expect(consoleSpy.mock.calls[index][0]).toBe(line);
      });
    });
  };

  testPrintResult("release version result", releaseVersionResult, [
    "GTS_IS_SNAPSHOT_VERSION=false",
    "GTS_IS_TAGGED_VERSION=true",
    "GTS_IS_SEMVER_VERSION=true",
    "GTS_IS_RELEASE_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=true",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true",
    "GTS_DOCKER_VERSION=1.0.0",
    "GTS_DOCKER_TAGS=1.0.0 1.0 1 latest",
    "GTS_JAVA_VERSION=1.0.0",
  ]);

  testPrintResult("snapshot version result", snapshotVersionResult, [
    "GTS_IS_SNAPSHOT_VERSION=true",
    "GTS_IS_TAGGED_VERSION=false",
    "GTS_IS_SEMVER_VERSION=false",
    "GTS_IS_RELEASE_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false",
    "GTS_DOCKER_VERSION=1.1.0-20240712221812.d382a736cbc1",
    "GTS_DOCKER_TAGS=1.1.0-20240712221812.d382a736cbc1 d382a736cbc13965792a331af59144f357e5669e main",
    "GTS_JAVA_VERSION=1.1.0-20240712221812.d382a736cbc1-SNAPSHOT",
  ]);

  testPrintResult(
    "release version result with custom prefix",
    releaseVersionResult,
    [
      "FOO_IS_SNAPSHOT_VERSION=false",
      "FOO_IS_TAGGED_VERSION=true",
      "FOO_IS_SEMVER_VERSION=true",
      "FOO_IS_RELEASE_SEMVER_VERSION=true",
      "FOO_IS_HIGHEST_SEMVER_VERSION=true",
      "FOO_IS_HIGHEST_SEMVER_RELEASE_VERSION=true",
      "FOO_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true",
      "FOO_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true",
      "FOO_DOCKER_VERSION=1.0.0",
      "FOO_DOCKER_TAGS=1.0.0 1.0 1 latest",
      "FOO_JAVA_VERSION=1.0.0",
    ],
    "FOO_",
  );

  describe("array output", () => {
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    const defaultTags = releaseVersionResult.strategies["docker"].tags;

    const testArrayOutput = (
      description: string,
      arrayValue: string[] = defaultTags,
      arrayDelimiter: string | undefined = " ",
      quoteArrays: boolean = false,
      expected: string,
    ) => {
      it(description, () => {
        printer.printResult(
          {
            output: {
              type: "env",
              env: {
                prefix: "GTS_",
                arrayDelimiter,
                quoteArrays,
              },
            },
          } as Config,
          {
            ...releaseVersionResult,
            strategies: {
              ...releaseVersionResult.strategies,
              docker: {
                ...releaseVersionResult.strategies["docker"],
                version: releaseVersionResult.strategies["docker"].version,
                tags: arrayValue,
              },
            },
          },
        );

        expect(
          consoleSpy.mock.calls.find((call: [string, ...unknown[]]) =>
            call[0].startsWith("GTS_DOCKER_TAGS="),
          )[0],
        ).toBe(`GTS_DOCKER_TAGS=${expected}`);
      });
    };

    testArrayOutput(
      "uses space delimiter when configured",
      defaultTags,
      " ",
      false,
      "1.0.0 1.0 1 latest",
    );

    testArrayOutput(
      "falls back to space delimiter when not configured",
      defaultTags,
      undefined,
      false,
      "1.0.0 1.0 1 latest",
    );

    testArrayOutput(
      "uses custom delimiter",
      defaultTags,
      ",",
      false,
      "1.0.0,1.0,1,latest",
    );

    testArrayOutput(
      "doesn't quote arrays with spaces if not configured",
      ["feature branch", "main"],
      ",",
      false,
      "feature branch,main",
    );

    testArrayOutput(
      "quotes arrays with spaces if configured",
      ["feature branch", "main"],
      ",",
      true,
      '"feature branch,main"',
    );
  });
});
