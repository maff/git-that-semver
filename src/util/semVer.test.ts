import { expect, test, describe } from "bun:test";
import { SemVer } from "semver";

import { semVerVersionString } from "./semVer";

describe("semVerVersionString", () => {
  const testCases = [
    {
      description: "version without build",
      inputs: ["1.2.3", "v1.2.3"],
      expected: "1.2.3",
    },
    {
      description: "version with build information",
      inputs: ["1.2.3+build.123", "v1.2.3+build.123"],
      expected: "1.2.3+build.123",
    },
    {
      description: "version with multiple build segments",
      inputs: ["1.2.3+build.123.meta.456", "v1.2.3+build.123.meta.456"],
      expected: "1.2.3+build.123.meta.456",
    },
    {
      description: "version with prerelease but no build",
      inputs: ["1.2.3-beta.1", "v1.2.3-beta.1"],
      expected: "1.2.3-beta.1",
    },
    {
      description: "version with both prerelease and build",
      inputs: ["1.2.3-beta.1+build.123", "v1.2.3-beta.1+build.123"],
      expected: "1.2.3-beta.1+build.123",
    },
  ];

  testCases.forEach(({ description, inputs, expected }) => {
    inputs.forEach((input) => {
      const prefix = input.startsWith("v")
        ? "with v prefix"
        : "without v prefix";
      test(`${description} ${prefix}`, () => {
        const version = new SemVer(input);
        expect(semVerVersionString(version)).toBe(expected);
      });
    });
  });
});
