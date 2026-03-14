import { describe, expect, it, mock } from "bun:test";
import semver from "semver";

import type { Config } from "../config/types";
import type { Platform } from "../platform";
import { resolveVersion } from "./versionResolver";
import { VersionStrategy } from "./versionStrategy";

// Mock git utilities before importing the module under test
const mockListTags = mock(() => [] as string[]);
const mockListTagsBeforeCommit = mock((_sha: string) => [] as string[]);
const mockGetCommitDateTime = mock((_sha: string) => "20240101120000");

mock.module("../util/git", () => ({
  listTags: mockListTags,
  listTagsBeforeCommit: mockListTagsBeforeCommit,
  getCommitDateTime: mockGetCommitDateTime,
}));

function createMockPlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    type: "test",
    isSupported: () => true,
    getCommitSha: () => "abc123",
    getCommitRefName: () => "main",
    getGitTag: () => undefined,
    getChangeRequestIdentifier: () => undefined,
    ...overrides,
  };
}

function createMinimalConfig(): Config {
  return {
    platform: "auto",
    defaults: {
      branchPrefixes: [],
      snapshot: {
        defaultBranches: ["main"],
        useChangeRequestIdentifier: true,
        prefixTpl:
          "{{ commitInfo.previousSemVerReleaseVersion | semver_inc: 'minor' | append: '-' }}",
        suffixTpl: "",
        branchIdentifierTpl: "",
        commitIdentifierTpl:
          "{{ commitInfo.dateTime }}.{{ commitInfo.sha | truncate: 12, '' }}",
        versionTpl:
          "{{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}",
      },
      tags: { enabled: false, snapshot: [], tagged: [], semVer: [] },
      properties: {},
    },
    strategies: {
      test: {
        enabled: true,
        snapshot: {
          defaultBranches: ["main"],
          useChangeRequestIdentifier: true,
          prefixTpl:
            "{{ commitInfo.previousSemVerReleaseVersion | semver_inc: 'minor' | append: '-' }}",
          suffixTpl: "",
          branchIdentifierTpl: "",
          commitIdentifierTpl:
            "{{ commitInfo.dateTime }}.{{ commitInfo.sha | truncate: 12, '' }}",
          versionTpl:
            "{{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}",
        },
        tags: { enabled: false, snapshot: [], tagged: [], semVer: [] },
        properties: {},
      },
    },
    output: {
      type: "env",
      env: { prefix: "GTS_", arrayDelimiter: " ", quoteArrays: false },
    },
  } as Config;
}

describe("versionResolver", () => {
  describe("isHighestSameMajorReleaseVersion", () => {
    it("should be true when release tag is highest release in its major, ignoring prereleases", () => {
      // Tags: v1.0.0 (release), v1.1.0-beta.1 (prerelease)
      // Building v1.0.0 — should be highest major=1 release
      mockListTags.mockReturnValue(["v1.0.0", "v1.1.0-beta.1"]);
      mockListTagsBeforeCommit.mockReturnValue(["v1.0.0"]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0",
      });

      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isReleaseSemVerVersion).toBe(true);
      expect(result.isHighestSameMajorReleaseVersion).toBe(true);
    });

    it("should be false when a higher release exists in the same major", () => {
      // Tags: v1.0.0, v1.1.0 — both releases
      // Building v1.0.0 — v1.1.0 is higher
      mockListTags.mockReturnValue(["v1.0.0", "v1.1.0"]);
      mockListTagsBeforeCommit.mockReturnValue(["v1.0.0"]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0",
      });

      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isReleaseSemVerVersion).toBe(true);
      expect(result.isHighestSameMajorReleaseVersion).toBe(false);
    });
  });

  describe("isHighestSameMinorReleaseVersion", () => {
    it("should be true when release tag is highest release in its minor, ignoring prereleases", () => {
      // Tags: v1.0.0 (release), v1.0.1-rc.1 (prerelease)
      // Building v1.0.0 — should be highest minor=1.0 release
      mockListTags.mockReturnValue(["v1.0.0", "v1.0.1-rc.1"]);
      mockListTagsBeforeCommit.mockReturnValue(["v1.0.0"]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0",
      });

      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isReleaseSemVerVersion).toBe(true);
      expect(result.isHighestSameMinorReleaseVersion).toBe(true);
    });

    it("should be false when a higher release exists in the same minor", () => {
      // Tags: v1.0.0, v1.0.1 — both releases
      // Building v1.0.0 — v1.0.1 is higher
      mockListTags.mockReturnValue(["v1.0.0", "v1.0.1"]);
      mockListTagsBeforeCommit.mockReturnValue(["v1.0.0"]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0",
      });

      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isReleaseSemVerVersion).toBe(true);
      expect(result.isHighestSameMinorReleaseVersion).toBe(false);
    });
  });
});
