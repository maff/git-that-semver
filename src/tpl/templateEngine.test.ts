import { expect, test, describe } from "bun:test";

import { templateEngine } from "./templateEngine";

describe("templateEngine", () => {
  describe("trim_alphanumeric filter", () => {
    test("removes non-alphanumeric characters from start and end", async () => {
      const template = `{{ input | trim_alphanumeric }}`;

      const testCases = [
        { input: "-hello123-", expected: "hello123" },
        { input: "!@#abc123", expected: "abc123" },
        { input: "abc123!@#", expected: "abc123" },
        { input: "!@#abc123!@#", expected: "abc123" },
        { input: "abc123", expected: "abc123" },
      ];

      for (const { input, expected } of testCases) {
        const result = await templateEngine.parseAndRender(template, { input });
        expect(result).toBe(expected);
      }
    });
  });

  describe("semver_inc filter", () => {
    test("increments semantic versions correctly", async () => {
      const template = `{{ version | semver_inc: type }}`;

      const testCases = [
        { version: "1.0.0", type: "major", expected: "2.0.0" },
        { version: "1.0.0", type: "minor", expected: "1.1.0" },
        { version: "1.0.0", type: "patch", expected: "1.0.1" },
        { version: "1.2.3", type: "prerelease", expected: "1.2.4-0" },
      ];

      for (const { version, type, expected } of testCases) {
        const result = await templateEngine.parseAndRender(template, {
          version,
          type,
        });
        expect(result).toBe(expected);
      }
    });

    test("throws error for invalid semver version", async () => {
      const template = `{{ version | semver_inc: 'major' }}`;

      await expect(
        templateEngine.parseAndRender(template, { version: "invalid" }),
      ).rejects.toThrow("Invalid semver version: invalid");
    });
  });
});
