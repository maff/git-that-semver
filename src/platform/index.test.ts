import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { resolvePlatform, specificPlatformTypes } from "./index";

describe("Platform Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("resolves GitHub platform when specified", () => {
    const platform = resolvePlatform("github");
    expect(platform.type).toBe("github");
  });

  test("resolves GitLab platform when specified", () => {
    const platform = resolvePlatform("gitlab");
    expect(platform.type).toBe("gitlab");
  });

  test("throws on unknown platform", () => {
    expect(() => resolvePlatform("unknown")).toThrow(
      "Unknown platform: unknown",
    );
  });

  test("auto-resolves GitHub platform in GitHub Actions", () => {
    process.env["CI"] = "true";
    process.env["GITHUB_ACTIONS"] = "true";

    const platform = resolvePlatform("auto");
    expect(platform.type).toBe("github");
  });

  test("auto-resolves GitLab platform in GitLab CI", () => {
    process.env["CI"] = "true";
    process.env["GITLAB_CI"] = "true";

    const platform = resolvePlatform("auto");
    expect(platform.type).toBe("gitlab");
  });

  test("throws when no platform can be auto-resolved", () => {
    process.env["CI"] = "false";
    expect(() => resolvePlatform("auto")).toThrow(
      "Platform could not be resolved automatically.",
    );
  });

  test("exports supported platform types", () => {
    expect(specificPlatformTypes).toEqual(["github", "gitlab"]);
  });
});
