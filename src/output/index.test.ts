import { describe, expect, it } from "bun:test";

import { Config } from "../config/types";
import { EnvOutputPrinter } from "./env";
import { resolveOutputPrinter } from "./index";
import { JsonOutputPrinter } from "./json";
import { YamlOutputPrinter } from "./yaml";

describe("resolveOutputPrinter", () => {
  const testResolveOutputPrinter = (outputType: string, expectedClass: any) => {
    it(`should resolve ${outputType} output printer`, () => {
      const config = {
        output: {
          type: outputType,
          env: {
            prefix: "GTS_",
          },
        },
      } as Config;

      const printer = resolveOutputPrinter(config);
      expect(printer).toBeInstanceOf(expectedClass);
    });
  };

  testResolveOutputPrinter("env", EnvOutputPrinter);
  testResolveOutputPrinter("json", JsonOutputPrinter);
  testResolveOutputPrinter("yaml", YamlOutputPrinter);
});
