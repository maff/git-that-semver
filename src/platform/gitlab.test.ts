import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { GitLabPlatform } from "./gitlab";

describe("GitLab Platform", () => {
  const platform = new GitLabPlatform();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["CI"] = "true";
    process.env["GITLAB_CI"] = "true";
    process.env["CI_COMMIT_SHA"] = "abc123";
    process.env["CI_COMMIT_REF_NAME"] = "main";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("identifies as gitlab platform", () => {
    expect(platform.type).toBe("gitlab");
  });

  test("detects GitLab CI environment", () => {
    expect(platform.isSupported()).toBe(true);

    process.env["GITLAB_CI"] = "false";
    expect(platform.isSupported()).toBe(false);
  });

  test("returns commit SHA", () => {
    expect(platform.getCommitSha()).toBe("abc123");
  });

  test("returns ref name", () => {
    expect(platform.getCommitRefName()).toBe("main");
  });

  test("returns git tag when available", () => {
    process.env["CI_COMMIT_TAG"] = "v1.0.0";
    expect(platform.getGitTag()).toBe("v1.0.0");
  });

  test("returns empty string when no tag is present", () => {
    expect(platform.getGitTag()).toBe("");
  });

  test("returns MR identifier for merge requests", () => {
    process.env["CI_MERGE_REQUEST_IID"] = "123";
    expect(platform.getChangeRequestIdentifier()).toBe("mr-123");
  });

  test("returns undefined for non-MR events", () => {
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });

  test("throws when required env vars are missing", () => {
    delete process.env["CI_COMMIT_SHA"];
    expect(() => platform.getCommitSha()).toThrow();
  });
});
