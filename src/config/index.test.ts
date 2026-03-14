import { describe, expect, it } from "bun:test";
import * as path from "path";

import { resolveConfig } from "./index";

const fixturesDir = path.resolve(__dirname, "../../test/fixtures");

describe("resolveConfig", () => {
  describe("default config", () => {
    it("should return valid config with nonexistent file path", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        undefined,
      );
      expect(config.platform).toBe("auto");
      expect(config.defaults).toBeDefined();
      expect(config.strategies).toBeDefined();
      expect(config.output).toBeDefined();
    });

    it("should have docker enabled by default", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        undefined,
      );
      expect(config.strategies.docker).toBeDefined();
      expect(config.strategies.docker.enabled).toBe(true);
    });

    it("should have npm and java disabled by default", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        undefined,
      );
      expect(config.strategies.npm).toBeUndefined();
      expect(config.strategies.java).toBeUndefined();
    });

    it("should return a frozen config", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        undefined,
      );
      expect(Object.isFrozen(config)).toBe(true);
    });
  });

  describe("custom config merging", () => {
    it("should merge custom config overrides", async () => {
      const config = await resolveConfig(
        path.join(fixturesDir, "custom-config.yaml"),
        [],
        [],
        undefined,
      );
      expect(config.output.env.prefix).toBe("CUSTOM_");
      expect(config.strategies.python).toBeDefined();
    });
  });

  describe("strategy enable/disable", () => {
    it("should enable strategies via params", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        ["npm", "java"],
        [],
        undefined,
      );
      expect(config.strategies.npm).toBeDefined();
      expect(config.strategies.java).toBeDefined();
    });

    it("should disable strategies via params", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        ["docker"],
        undefined,
      );
      expect(config.strategies.docker).toBeUndefined();
    });
  });

  describe("output format override", () => {
    it("should override output format", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        "json",
      );
      expect(config.output.type).toBe("json");
    });
  });

  describe("strategy inherits defaults", () => {
    it("should inherit snapshot templates from defaults", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        ["npm"],
        [],
        undefined,
      );
      expect(config.strategies.npm.snapshot.versionTpl).toBeDefined();
      expect(config.strategies.npm.snapshot.versionTpl.length).toBeGreaterThan(
        0,
      );
    });

    it("should NOT inherit branchPrefixes to strategies", async () => {
      const config = await resolveConfig(
        "/nonexistent/path/git-that-semver.yaml",
        [],
        [],
        undefined,
      );
      expect((config.strategies.docker as any).branchPrefixes).toBeUndefined();
    });
  });

  describe("invalid config", () => {
    it("should throw Zod error for invalid platform value", async () => {
      await expect(
        resolveConfig(
          path.join(fixturesDir, "invalid-platform.yaml"),
          [],
          [],
          undefined,
        ),
      ).rejects.toThrow();
    });
  });
});
