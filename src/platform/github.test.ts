import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { GitHubPlatform } from "./github";

describe("GitHub Platform", () => {
  const platform = new GitHubPlatform();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["CI"] = "true";
    process.env["GITHUB_ACTIONS"] = "true";
    process.env["GITHUB_SHA"] = "abc123";
    process.env["GITHUB_EVENT_NAME"] = "push";
    process.env["GITHUB_REF_NAME"] = "main";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("identifies as github platform", () => {
    expect(platform.type).toBe("github");
  });

  test("detects GitHub Actions environment", () => {
    expect(platform.isSupported()).toBe(true);

    process.env["GITHUB_ACTIONS"] = "false";
    expect(platform.isSupported()).toBe(false);
  });

  test("returns commit SHA", () => {
    expect(platform.getCommitSha()).toBe("abc123");
  });

  test("returns ref name", () => {
    expect(platform.getCommitRefName()).toBe("main");
  });

  test("returns PR branch name for pull requests", () => {
    process.env["GITHUB_EVENT_NAME"] = "pull_request";
    process.env["GITHUB_HEAD_REF"] = "feature/test";
    expect(platform.getCommitRefName()).toBe("feature/test");
  });

  test("returns git tag when ref is a tag", () => {
    process.env["GITHUB_REF_TYPE"] = "tag";
    process.env["GITHUB_REF_NAME"] = "v1.0.0";
    expect(platform.getGitTag()).toBe("v1.0.0");
  });

  test("returns empty string for non-tag refs", () => {
    process.env["GITHUB_REF_TYPE"] = "branch";
    expect(platform.getGitTag()).toBe("");
  });

  test("returns PR identifier for pull requests", () => {
    process.env["GITHUB_EVENT_NAME"] = "pull_request";
    process.env["GITHUB_REF"] = "refs/pull/123/merge";
    expect(platform.getChangeRequestIdentifier()).toBe("pr-123");
  });

  test("returns undefined for non-PR events", () => {
    process.env["GITHUB_EVENT_NAME"] = "push";
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });

  test("throws when required env vars are missing", () => {
    delete process.env["GITHUB_SHA"];
    expect(() => platform.getCommitSha()).toThrow();
  });
});
