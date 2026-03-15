import { describe, expect, it } from "bun:test";
import semver from "semver";

import type { Config, StrategyConfig } from "../config/types";
import type { Platform } from "../platform";
import type { CommitInfo, VersionInfo } from "./versionResolver";
import {
  VersionStrategy,
  type VersionStrategyContext,
  resolveStrategies,
} from "./versionStrategy";

function createStrategyConfig(
  overrides: Partial<StrategyConfig> = {},
): StrategyConfig {
  return {
    enabled: true,
    snapshot: {
      defaultBranches: ["main"],
      useChangeRequestIdentifier: true,
      prefixTpl: "{{ commitInfo.previousSemVerReleaseVersion }}-",
      suffixTpl: "",
      branchIdentifierTpl:
        "{% if branchIdentifier %}{{ branchIdentifier | append: '.' }}{% endif %}",
      commitIdentifierTpl:
        "{{ commitInfo.dateTime }}.{{ commitInfo.sha | truncate: 12, '' }}",
      versionTpl:
        "{{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}",
    },
    tags: {
      enabled: true,
      snapshot: ["{{ version }}"],
      tagged: ["{{ version }}"],
      semVer: [
        "{{ version }}",
        "{% if versionInfo.isHighestSameMinorReleaseVersion %}{{ semVer.major }}.{{ semVer.minor }}{% endif %}",
      ],
    },
    properties: {},
    ...overrides,
  } as StrategyConfig;
}

function createContext(
  overrides: Partial<VersionInfo> = {},
): VersionStrategyContext {
  return {
    config: {} as Config,
    platform: {} as Platform,
    versionInfo: {
      isSnapshotVersion: false,
      isTaggedVersion: false,
      isSemVerVersion: false,
      isReleaseSemVerVersion: false,
      isHighestSemVerVersion: false,
      isHighestSemVerReleaseVersion: false,
      isHighestSameMajorReleaseVersion: false,
      isHighestSameMinorReleaseVersion: false,
      ...overrides,
    },
  };
}

function createCommitInfo(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    sha: "abc123def456",
    refName: "main",
    refNameSlug: "main",
    changeRequestIdentifier: undefined,
    tag: undefined,
    dateTime: "20240101120000",
    previousSemVerVersion: "1.0.0",
    previousSemVerReleaseVersion: "1.0.0",
    ...overrides,
  };
}

describe("resolveStrategies", () => {
  it("should filter disabled strategies", () => {
    const strategies = resolveStrategies({
      enabled: createStrategyConfig({ enabled: true }),
      disabled: createStrategyConfig({ enabled: false }),
    });
    expect(strategies).toHaveLength(1);
    expect(strategies[0].name).toBe("enabled");
  });

  it("should return correct names", () => {
    const strategies = resolveStrategies({
      docker: createStrategyConfig(),
      npm: createStrategyConfig(),
    });
    expect(strategies.map((s) => s.name)).toEqual(["docker", "npm"]);
  });

  it("should return empty array for empty input", () => {
    expect(resolveStrategies({})).toEqual([]);
  });
});

describe("VersionStrategy", () => {
  describe("taggedVersionResult", () => {
    it("should use tag as version", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ tag: "build-123" }),
        "build-123",
      );
      expect(result.version).toBe("build-123");
    });

    it("should render tags when enabled", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ tag: "build-123" }),
        "build-123",
      );
      expect(result.tags).toContain("build-123");
    });

    it("should return empty tags when disabled", () => {
      const config = createStrategyConfig({
        tags: {
          enabled: false,
          snapshot: [],
          tagged: ["{{ version }}"],
          semVer: [],
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ tag: "build-123" }),
        "build-123",
      );
      expect(result.tags).toEqual([]);
    });

    it("should include properties", () => {
      const config = createStrategyConfig({
        properties: { customProp: "value" },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ tag: "build-123" }),
        "build-123",
      );
      expect(result.customProp).toBe("value");
    });

    it("should render template expressions in properties", () => {
      const config = createStrategyConfig({
        properties: {
          commitSha: "{{ commitInfo.sha }}",
          tagName: "{{ version }}",
          static: "plain-value",
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ sha: "abc123def456", tag: "build-123" }),
        "build-123",
      );
      expect(result.commitSha).toBe("abc123def456");
      expect(result.tagName).toBe("build-123");
      expect(result.static).toBe("plain-value");
    });

    it("should not allow properties to overwrite version or tags", () => {
      const config = createStrategyConfig({
        properties: {
          version: "overwritten",
          tags: "overwritten",
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.taggedVersionResult(
        createContext({ isTaggedVersion: true }),
        createCommitInfo({ tag: "build-123" }),
        "build-123",
      );
      expect(result.version).toBe("build-123");
      expect(result.tags).toContain("build-123");
    });
  });

  describe("semVerVersionResult", () => {
    it("should use semver string as version", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const version = semver.parse("1.2.3")!;
      const result = strategy.semVerVersionResult(
        createContext({ isSemVerVersion: true }),
        createCommitInfo({ tag: "v1.2.3" }),
        version,
      );
      expect(result.version).toBe("1.2.3");
    });

    it("should render template expressions in properties with semVer context", () => {
      const config = createStrategyConfig({
        properties: {
          majorVersion: "{{ semVer.major }}",
          previousRelease: "{{ commitInfo.previousSemVerReleaseVersion }}",
        },
      });
      const strategy = new VersionStrategy("test", config);
      const version = semver.parse("2.3.0")!;
      const result = strategy.semVerVersionResult(
        createContext({ isSemVerVersion: true }),
        createCommitInfo({ tag: "v2.3.0" }),
        version,
      );
      expect(result.majorVersion).toBe("2");
      expect(result.previousRelease).toBe("1.0.0");
    });

    it("should make semVer context available in tag templates", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const version = semver.parse("2.3.0")!;
      const result = strategy.semVerVersionResult(
        createContext({
          isSemVerVersion: true,
          isHighestSameMinorReleaseVersion: true,
        }),
        createCommitInfo({ tag: "v2.3.0" }),
        version,
      );
      expect(result.tags).toContain("2.3");
    });

    it("should deduplicate tags", () => {
      const config = createStrategyConfig({
        tags: {
          enabled: true,
          snapshot: [],
          tagged: [],
          semVer: ["{{ version }}", "{{ version }}"],
        },
      });
      const strategy = new VersionStrategy("test", config);
      const version = semver.parse("1.0.0")!;
      const result = strategy.semVerVersionResult(
        createContext({ isSemVerVersion: true }),
        createCommitInfo({ tag: "v1.0.0" }),
        version,
      );
      const versionTags = result.tags.filter((t) => t === "1.0.0");
      expect(versionTags).toHaveLength(1);
    });

    it("should filter empty tags", () => {
      const config = createStrategyConfig({
        tags: {
          enabled: true,
          snapshot: [],
          tagged: [],
          semVer: [
            "{{ version }}",
            "{% if versionInfo.isHighestSameMinorReleaseVersion %}{{ semVer.major }}.{{ semVer.minor }}{% endif %}",
          ],
        },
      });
      const strategy = new VersionStrategy("test", config);
      const version = semver.parse("1.0.0")!;
      const result = strategy.semVerVersionResult(
        createContext({
          isSemVerVersion: true,
          isHighestSameMinorReleaseVersion: false,
        }),
        createCommitInfo({ tag: "v1.0.0" }),
        version,
      );
      expect(result.tags).toEqual(["1.0.0"]);
    });
  });

  describe("snapshotVersionResult", () => {
    it("should render full template chain", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo(),
      );
      expect(result.version).toBe("1.0.0-20240101120000.abc123def456");
    });

    it("should omit branch identifier for default branches", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo({ refName: "main", refNameSlug: "main" }),
      );
      expect(result.version).not.toContain("main.");
    });

    it("should include branch identifier for non-default branches", () => {
      const strategy = new VersionStrategy("test", createStrategyConfig());
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo({ refName: "feature/test", refNameSlug: "test" }),
      );
      expect(result.version).toContain("test.");
    });

    it("should make intermediate variables available in snapshot tag templates", () => {
      const config = createStrategyConfig({
        tags: {
          enabled: true,
          snapshot: [
            "{{ prefix | trim_alphanumeric }}",
            "{{ branchIdentifier | trim_alphanumeric }}",
            "{{ commitIdentifier }}",
            "{{ suffix }}",
          ],
          tagged: [],
          semVer: [],
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo({ refName: "feature/test", refNameSlug: "test" }),
      );
      expect(result.tags).toContain("1.0.0");
      expect(result.tags).toContain("test");
      expect(result.tags).toContain("20240101120000.abc123def456");
    });

    it("should apply suffix", () => {
      const config = createStrategyConfig({
        snapshot: {
          ...createStrategyConfig().snapshot,
          suffixTpl: "-SNAPSHOT",
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo(),
      );
      expect(result.version).toEndWith("-SNAPSHOT");
    });

    it("should render template expressions in properties with snapshot context", () => {
      const config = createStrategyConfig({
        properties: {
          baseVersion:
            "{{ commitInfo.previousSemVerReleaseVersion | semver_inc: 'minor' }}",
          snapshotVersion: "{{ version }}",
        },
      });
      const strategy = new VersionStrategy("test", config);
      const result = strategy.snapshotVersionResult(
        createContext({ isSnapshotVersion: true }),
        createCommitInfo(),
      );
      expect(result.baseVersion).toBe("1.1.0");
      expect(result.snapshotVersion).toBe("1.0.0-20240101120000.abc123def456");
    });
  });
});
