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
    getGitTag: () => "",
    getChangeRequestIdentifier: () => undefined,
    ...overrides,
  };
}

function createMinimalConfig(overrides: Partial<Config> = {}): Config {
  return {
    platform: "auto",
    defaults: {
      branchPrefixes: ["feature/", "bugfix/"],
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
    ...overrides,
  } as Config;
}

describe("versionResolver", () => {
  describe("snapshot version", () => {
    it("should set isSnapshotVersion true for untagged commit", () => {
      mockListTags.mockReturnValue([]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform();
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isSnapshotVersion).toBe(true);
      expect(result.isTaggedVersion).toBe(false);
      expect(result.isSemVerVersion).toBe(false);
      expect(result.isReleaseSemVerVersion).toBe(false);
      expect(result.isHighestSemVerVersion).toBe(false);
      expect(result.isHighestSemVerReleaseVersion).toBe(false);
      expect(result.isHighestSameMajorReleaseVersion).toBe(false);
      expect(result.isHighestSameMinorReleaseVersion).toBe(false);
    });
  });

  describe("tagged non-semver version", () => {
    it("should set isTaggedVersion true and isSemVerVersion false for non-semver tag", () => {
      mockListTags.mockReturnValue(["build-123"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "build-123",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isSnapshotVersion).toBe(false);
      expect(result.isTaggedVersion).toBe(true);
      expect(result.isSemVerVersion).toBe(false);
      expect(result.isReleaseSemVerVersion).toBe(false);
    });
  });

  describe("tagged semver release", () => {
    it("should set all highest flags true when tag is the only semver tag", () => {
      mockListTags.mockReturnValue(["v2.0.0"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "v2.0.0",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isTaggedVersion).toBe(true);
      expect(result.isSemVerVersion).toBe(true);
      expect(result.isReleaseSemVerVersion).toBe(true);
      expect(result.isHighestSemVerVersion).toBe(true);
      expect(result.isHighestSemVerReleaseVersion).toBe(true);
      expect(result.isHighestSameMajorReleaseVersion).toBe(true);
      expect(result.isHighestSameMinorReleaseVersion).toBe(true);
    });
  });

  describe("tagged semver prerelease", () => {
    it("should set isReleaseSemVerVersion false for prerelease tag", () => {
      mockListTags.mockReturnValue(["v1.0.0-beta.1"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0-beta.1",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isTaggedVersion).toBe(true);
      expect(result.isSemVerVersion).toBe(true);
      expect(result.isReleaseSemVerVersion).toBe(false);
      expect(result.isHighestSemVerVersion).toBe(true);
      expect(result.isHighestSemVerReleaseVersion).toBe(false);
      expect(result.isHighestSameMajorReleaseVersion).toBe(false);
      expect(result.isHighestSameMinorReleaseVersion).toBe(false);
    });
  });

  describe("isHighestSemVerVersion", () => {
    it("should be true when tag is the highest semver", () => {
      mockListTags.mockReturnValue(["v1.0.0", "v2.0.0"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "v2.0.0",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isHighestSemVerVersion).toBe(true);
    });

    it("should be false when a higher semver exists", () => {
      mockListTags.mockReturnValue(["v1.0.0", "v2.0.0", "v3.0.0"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "v2.0.0",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isHighestSemVerVersion).toBe(false);
    });
  });

  describe("isHighestSemVerReleaseVersion", () => {
    it("should ignore prereleases when determining highest release", () => {
      mockListTags.mockReturnValue(["v1.0.0", "v2.0.0-beta.1"]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getGitTag: () => "v1.0.0",
      });
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      expect(result.isHighestSemVerReleaseVersion).toBe(true);
    });
  });

  describe("isHighestSameMajorReleaseVersion", () => {
    it("should be true when release tag is highest release in its major, ignoring prereleases", () => {
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

  describe("resolveRefSlugName (via commitInfo)", () => {
    function createConfigWithBranchTpl(): Config {
      const config = createMinimalConfig();
      // Use a branchIdentifierTpl that includes the branch slug
      const branchTpl =
        "{% if branchIdentifier %}{{ branchIdentifier | append: '.' }}{% endif %}";
      config.strategies.test.snapshot.branchIdentifierTpl = branchTpl;
      return config;
    }

    it("should strip known branch prefixes and slugify", () => {
      mockListTags.mockReturnValue([]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getCommitRefName: () => "feature/my-cool-feature",
      });
      const config = createConfigWithBranchTpl();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      // "feature/" prefix stripped, "my-cool-feature" slugified
      expect(result.strategies.test.version).toContain("my-cool-feature");
    });

    it("should slugify ref names without matching prefix", () => {
      mockListTags.mockReturnValue([]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform({
        getCommitRefName: () => "release/1.0.x",
      });
      const config = createConfigWithBranchTpl();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      // "release/" is not in branchPrefixes, so the full name gets slugified
      expect(result.strategies.test.version).toContain("release");
    });
  });

  describe("findPreviousSemVerVersions (via commitInfo)", () => {
    it("should default to 0.0.0 when no previous semver tags exist", () => {
      mockListTags.mockReturnValue([]);
      mockListTagsBeforeCommit.mockReturnValue([]);

      const platform = createMockPlatform();
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      // With previous version 0.0.0, prefix should be "0.1.0-"
      expect(result.strategies.test.version).toMatch(/^0\.1\.0-/);
    });

    it("should use previous release version separately from all versions", () => {
      mockListTags.mockReturnValue([]);
      mockListTagsBeforeCommit.mockReturnValue(["v1.0.0", "v1.1.0-beta.1"]);

      const platform = createMockPlatform();
      const config = createMinimalConfig();
      const strategies = [new VersionStrategy("test", config.strategies.test)];
      const result = resolveVersion(config, platform, strategies);

      // Previous release is v1.0.0, so prefix should increment minor: "1.1.0-"
      expect(result.strategies.test.version).toMatch(/^1\.1\.0-/);
    });
  });
});
