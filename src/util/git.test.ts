import {
  describe,
  expect,
  test,
  mock,
  afterEach,
  spyOn,
  beforeEach,
} from "bun:test";

import { listTags, listTagsBeforeCommit, getCommitDateTime } from "./git";
import * as processModule from "./process";

describe("git utilities", () => {
  let executeCommandSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    executeCommandSpy = spyOn(processModule, "executeCommand");
  });

  afterEach(() => {
    mock.restore();
  });

  describe("listTags", () => {
    test("should return array of tags", () => {
      executeCommandSpy.mockImplementation(() => "v1.0.0\nv1.1.0\nv2.0.0\n");

      const result = listTags();

      expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
      expect(result).toEqual(["v1.0.0", "v1.1.0", "v2.0.0"]);
    });

    test("should handle empty response", () => {
      executeCommandSpy.mockImplementation(() => "");

      const result = listTags();

      expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
      expect(result).toEqual([]);
    });
  });

  describe("listTagsBeforeCommit", () => {
    test("should return tags before specific commit", () => {
      executeCommandSpy.mockImplementation(() => "v2.0.0\nv1.1.0\nv1.0.0\n");
      const commitSha = "abc123";

      const result = listTagsBeforeCommit(commitSha);

      expect(executeCommandSpy).toHaveBeenCalledWith([
        "git",
        "tag",
        "-l",
        "--sort=-version:refname",
        "--merged",
        commitSha,
      ]);
      expect(result).toEqual(["v2.0.0", "v1.1.0", "v1.0.0"]);
    });

    test("should handle empty response", () => {
      executeCommandSpy.mockImplementation(() => "");
      const commitSha = "abc123";

      const result = listTagsBeforeCommit(commitSha);

      expect(executeCommandSpy).toHaveBeenCalledWith([
        "git",
        "tag",
        "-l",
        "--sort=-version:refname",
        "--merged",
        commitSha,
      ]);
      expect(result).toEqual([]);
    });
  });

  describe("getCommitDateTime", () => {
    test("should return formatted date time for commit", () => {
      executeCommandSpy.mockImplementation(() => "20240315123456");
      const commitSha = "abc123";

      const result = getCommitDateTime(commitSha);

      expect(executeCommandSpy).toHaveBeenCalledWith([
        "git",
        "show",
        "-s",
        "--format=%cd",
        "--date=format:%Y%m%d%H%M%S",
        commitSha,
      ]);
      expect(result).toEqual("20240315123456");
    });
  });
});
