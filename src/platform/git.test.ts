import { describe, expect, test } from "bun:test";

import { GitPlatform } from "./git";

describe("Git Platform", () => {
  const platform = new GitPlatform();

  test("identifies as git platform", () => {
    expect(platform.type).toBe("git");
  });

  test("returns commit SHA as 40-char hex string", () => {
    const sha = platform.getCommitSha();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  test("returns current branch name", () => {
    const refName = platform.getCommitRefName();
    expect(refName.length).toBeGreaterThan(0);
  });

  test("returns string or undefined for git tag", () => {
    const tag = platform.getGitTag();
    expect(tag === undefined || typeof tag === "string").toBe(true);
  });

  test("always returns undefined for change request identifier", () => {
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });
});
