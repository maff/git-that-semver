import { describe, expect, test } from "bun:test";

import { ManualPlatform } from "./manual";

describe("Manual Platform", () => {
  test("identifies as manual platform", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "main",
    });
    expect(platform.type).toBe("manual");
  });

  test("returns provided commit SHA", () => {
    const platform = new ManualPlatform({
      sha: "abc123def456",
      refName: "main",
    });
    expect(platform.getCommitSha()).toBe("abc123def456");
  });

  test("returns provided ref name", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "feature/test",
    });
    expect(platform.getCommitRefName()).toBe("feature/test");
  });

  test("returns provided git tag", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "main",
      tag: "v1.0.0",
    });
    expect(platform.getGitTag()).toBe("v1.0.0");
  });

  test("returns undefined for git tag when not provided", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "main",
    });
    expect(platform.getGitTag()).toBeUndefined();
  });

  test("returns provided change request identifier", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "main",
      changeRequestId: "pr-42",
    });
    expect(platform.getChangeRequestIdentifier()).toBe("pr-42");
  });

  test("returns undefined for change request identifier when not provided", () => {
    const platform = new ManualPlatform({
      sha: "abc123",
      refName: "main",
    });
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });

  test("throws when commit SHA is missing", () => {
    expect(
      () =>
        new ManualPlatform({
          sha: "",
          refName: "main",
        }),
    ).toThrow(
      "Manual platform requires --commit-sha and --ref-name (or GTS_COMMIT_SHA and GTS_REF_NAME)",
    );
  });

  test("throws when ref name is missing", () => {
    expect(
      () =>
        new ManualPlatform({
          sha: "abc123",
          refName: "",
        }),
    ).toThrow(
      "Manual platform requires --commit-sha and --ref-name (or GTS_COMMIT_SHA and GTS_REF_NAME)",
    );
  });
});
