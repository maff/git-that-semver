import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";

import { executeCommand as realExecuteCommand } from "../util/process";

const mockExecuteCommand = mock();

mock.module("../util/process", () => ({
  executeCommand: mockExecuteCommand,
}));

const { GitPlatform } = await import("./git");

afterEach(() => {
  mockExecuteCommand.mockReset();
});

// Restore the real module after all tests in this file
// to avoid poisoning other test files
afterAll(() => {
  mock.module("../util/process", () => ({
    executeCommand: realExecuteCommand,
  }));
});

describe("Git Platform", () => {
  const platform = new GitPlatform();

  test("identifies as git platform", () => {
    expect(platform.type).toBe("git");
  });

  test("returns commit SHA from git rev-parse HEAD", () => {
    mockExecuteCommand.mockReturnValueOnce(
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    );

    expect(platform.getCommitSha()).toBe(
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    );
    expect(mockExecuteCommand).toHaveBeenLastCalledWith([
      "git",
      "rev-parse",
      "HEAD",
    ]);
  });

  test("returns branch name from git branch --show-current", () => {
    mockExecuteCommand.mockReturnValueOnce("feature/my-branch");

    expect(platform.getCommitRefName()).toBe("feature/my-branch");
    expect(mockExecuteCommand).toHaveBeenLastCalledWith([
      "git",
      "branch",
      "--show-current",
    ]);
  });

  test("falls back to git rev-parse --abbrev-ref HEAD on detached HEAD", () => {
    mockExecuteCommand
      .mockReturnValueOnce("") // git branch --show-current returns empty
      .mockReturnValueOnce("HEAD"); // git rev-parse --abbrev-ref HEAD

    expect(platform.getCommitRefName()).toBe("HEAD");
    expect(mockExecuteCommand).toHaveBeenLastCalledWith([
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
  });

  test("returns tag from git describe --tags --exact-match", () => {
    mockExecuteCommand.mockReturnValueOnce("v1.2.3");

    expect(platform.getGitTag()).toBe("v1.2.3");
    expect(mockExecuteCommand).toHaveBeenLastCalledWith([
      "git",
      "describe",
      "--tags",
      "--exact-match",
      "HEAD",
    ]);
  });

  test("returns undefined when HEAD is not tagged", () => {
    mockExecuteCommand.mockImplementationOnce(() => {
      throw new Error("fatal: no tag exactly matches");
    });

    expect(platform.getGitTag()).toBeUndefined();
  });

  test("always returns undefined for change request identifier", () => {
    expect(platform.getChangeRequestIdentifier()).toBeUndefined();
  });
});
