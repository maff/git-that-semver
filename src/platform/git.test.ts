import { afterEach, describe, expect, mock, test } from "bun:test";

import { GitPlatform } from "./git";

describe("Git Platform", () => {
  const mockExec = mock();
  const platform = new GitPlatform(mockExec);

  afterEach(() => {
    mockExec.mockReset();
  });

  test("identifies as git platform", () => {
    expect(platform.type).toBe("git");
  });

  test("returns commit SHA from git rev-parse HEAD", () => {
    mockExec.mockReturnValueOnce("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");

    expect(platform.getCommitSha()).toBe(
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    );
    expect(mockExec).toHaveBeenLastCalledWith(["git", "rev-parse", "HEAD"]);
  });

  test("returns branch name from git branch --show-current", () => {
    mockExec.mockReturnValueOnce("feature/my-branch");

    expect(platform.getCommitRefName()).toBe("feature/my-branch");
    expect(mockExec).toHaveBeenLastCalledWith([
      "git",
      "branch",
      "--show-current",
    ]);
  });

  test("falls back to git rev-parse --abbrev-ref HEAD on detached HEAD", () => {
    mockExec
      .mockReturnValueOnce("") // git branch --show-current returns empty
      .mockReturnValueOnce("HEAD"); // git rev-parse --abbrev-ref HEAD

    expect(platform.getCommitRefName()).toBe("HEAD");
    expect(mockExec).toHaveBeenLastCalledWith([
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
  });

  test("returns tag from git describe --tags --exact-match", () => {
    mockExec.mockReturnValueOnce("v1.2.3");

    expect(platform.getGitTag()).toBe("v1.2.3");
    expect(mockExec).toHaveBeenLastCalledWith([
      "git",
      "describe",
      "--tags",
      "--exact-match",
      "HEAD",
    ]);
  });

  test("returns undefined when HEAD is not tagged", () => {
    mockExec.mockImplementationOnce(() => {
      throw new Error("fatal: no tag exactly matches");
    });

    expect(platform.getGitTag()).toBeUndefined();
  });

  test("always returns undefined for change request identifier", () => {
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });
});
