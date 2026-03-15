import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  allPlatformTypes,
  resolvePlatform,
  specificPlatformTypes,
} from "./index";

describe("Platform Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["GITHUB_ACTIONS"];
    delete process.env["GITLAB_CI"];
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

  test("resolves git platform when specified", () => {
    const platform = resolvePlatform("git");
    expect(platform.type).toBe("git");
  });

  test("resolves manual platform when specified with options", () => {
    const platform = resolvePlatform("manual", {
      sha: "abc123",
      refName: "main",
    });
    expect(platform.type).toBe("manual");
  });

  test("throws when manual platform specified without options", () => {
    expect(() => resolvePlatform("manual")).toThrow(
      "Manual platform requires --commit-sha and --ref-name",
    );
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

  test("auto-resolves manual platform when manual options provided", () => {
    process.env["CI"] = "false";

    const platform = resolvePlatform("auto", {
      sha: "abc123",
      refName: "main",
    });
    expect(platform.type).toBe("manual");
  });

  test("throws when no platform can be auto-resolved", () => {
    process.env["CI"] = "false";
    expect(() => resolvePlatform("auto")).toThrow(
      "Platform could not be resolved automatically.",
    );
  });

  test("exports auto-detectable platform types", () => {
    expect(specificPlatformTypes).toEqual(["github", "gitlab"]);
  });

  test("exports all platform types including git and manual", () => {
    expect(allPlatformTypes).toEqual(["github", "gitlab", "git", "manual"]);
  });
});
