import { spawn } from "bun";
import { beforeEach, describe, expect, it, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Helper to run git-that-semver CLI
async function runGitThatSemver(
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Resolve project root directory from test file location
  const projectRoot = path.resolve(__dirname, "../..");

  // Create clean environment with only essential variables, removing all CI-related vars
  const cleanEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    SHELL: process.env.SHELL,
    TERM: process.env.TERM,
  };

  const proc = spawn({
    cmd: ["bun", "run", "index.ts", ...args],
    cwd: projectRoot,
    env: { ...cleanEnv, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return {
    stdout,
    stderr,
    exitCode,
  };
}

describe("git-that-semver e2e tests", () => {
  let currentCommitSha: string;

  beforeEach(async () => {
    // Get current commit SHA for tests
    const projectRoot = path.resolve(__dirname, "../..");
    const proc = spawn({
      cmd: ["git", "rev-parse", "HEAD"],
      cwd: projectRoot,
      stdout: "pipe",
    });
    currentCommitSha = (await new Response(proc.stdout).text()).trim();
  });

  describe("Snapshot build (README example 1)", () => {
    it("should generate snapshot versions when on untagged commit", async () => {
      const result = await runGitThatSemver(
        ["-e", "java", "-e", "npm", "-e", "docker"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: currentCommitSha,
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("GTS_IS_SNAPSHOT_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_TAGGED_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_SEMVER_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_RELEASE_SEMVER_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_HIGHEST_SEMVER_VERSION=false");
      expect(result.stdout).toContain(
        "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false",
      );
      expect(result.stdout).toContain(
        "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false",
      );
      expect(result.stdout).toContain(
        "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false",
      );

      // Check that version strings contain expected patterns
      const shortSha = currentCommitSha.substring(0, 12);
      expect(result.stdout).toMatch(
        new RegExp(`GTS_JAVA_VERSION=.*${shortSha}-SNAPSHOT`),
      );
      expect(result.stdout).toMatch(
        new RegExp(`GTS_NPM_VERSION=.*${shortSha}`),
      );
      expect(result.stdout).toMatch(
        new RegExp(`GTS_DOCKER_VERSION=.*${shortSha}`),
      );
      // Check that the full commit SHA appears in docker tags
      expect(result.stdout).toContain(currentCommitSha);
    });
  });

  describe("Release version (README example 2)", () => {
    it("should generate release versions when on tagged commit", async () => {
      const result = await runGitThatSemver(
        ["-e", "java", "-e", "npm", "-e", "docker"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: currentCommitSha,
          CI_COMMIT_TAG: "v1.0.0",
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("GTS_IS_SNAPSHOT_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_TAGGED_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_SEMVER_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_RELEASE_SEMVER_VERSION=true");
      expect(result.stdout).toContain("GTS_JAVA_VERSION=1.0.0");
      expect(result.stdout).toContain("GTS_NPM_VERSION=1.0.0");
      expect(result.stdout).toContain("GTS_DOCKER_VERSION=1.0.0");
    });
  });

  describe("Pre-release version (README example 3)", () => {
    it("should generate pre-release versions with beta tag", async () => {
      const result = await runGitThatSemver(
        ["-e", "java", "-e", "npm", "-e", "docker"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: currentCommitSha,
          CI_COMMIT_TAG: "v1.1.0-beta.1",
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("GTS_IS_SNAPSHOT_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_TAGGED_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_SEMVER_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_RELEASE_SEMVER_VERSION=false");
      expect(result.stdout).toContain("GTS_JAVA_VERSION=1.1.0-beta.1");
      expect(result.stdout).toContain("GTS_NPM_VERSION=1.1.0-beta.1");
      expect(result.stdout).toContain("GTS_DOCKER_VERSION=1.1.0-beta.1");
      expect(result.stdout).toContain("GTS_DOCKER_TAGS=1.1.0-beta.1");
    });
  });

  describe("Patch version (README example 4)", () => {
    it("should generate patch versions on release branch", async () => {
      const result = await runGitThatSemver(
        ["-e", "java", "-e", "npm", "-e", "docker"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "release/1.0.x",
          CI_COMMIT_SHA: currentCommitSha,
          CI_COMMIT_TAG: "v1.0.1",
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("GTS_IS_SNAPSHOT_VERSION=false");
      expect(result.stdout).toContain("GTS_IS_TAGGED_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_SEMVER_VERSION=true");
      expect(result.stdout).toContain("GTS_IS_RELEASE_SEMVER_VERSION=true");
      expect(result.stdout).toContain("GTS_JAVA_VERSION=1.0.1");
      expect(result.stdout).toContain("GTS_NPM_VERSION=1.0.1");
      expect(result.stdout).toContain("GTS_DOCKER_VERSION=1.0.1");
    });
  });

  describe("GitHub Actions platform", () => {
    it("should detect GitHub Actions platform and generate versions", async () => {
      const result = await runGitThatSemver(["-e", "npm"], {
        CI: "true",
        GITHUB_ACTIONS: "true",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: currentCommitSha,
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF_TYPE: "branch",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("GTS_IS_SNAPSHOT_VERSION=true");
      const shortSha = currentCommitSha.substring(0, 12);
      expect(result.stdout).toMatch(
        new RegExp(`GTS_NPM_VERSION=.*${shortSha}`),
      );
    });
  });

  describe("Configuration override", () => {
    it("should allow configuration overrides via CLI", async () => {
      const result = await runGitThatSemver(
        [
          "-e",
          "npm",
          "-c",
          "output.env.prefix=CUSTOM_",
          "-c",
          "defaults.snapshot.useChangeRequestIdentifier=false",
        ],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: currentCommitSha,
        },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("CUSTOM_IS_SNAPSHOT_VERSION=true");
      expect(result.stdout).toMatch(/CUSTOM_NPM_VERSION=/);
    });
  });

  describe("Output formats", () => {
    it("should output JSON format when requested", async () => {
      const result = await runGitThatSemver(["-o", "json", "-e", "npm"], {
        CI: "true",
        GITLAB_CI: "true",
        CI_COMMIT_REF_NAME: "main",
        CI_COMMIT_SHA: currentCommitSha,
        CI_COMMIT_TAG: "v1.0.0",
      });

      expect(result.exitCode).toBe(0);

      let output;
      try {
        output = JSON.parse(result.stdout);
      } catch (e) {
        console.log("Failed to parse JSON output:", result.stdout);
        throw e;
      }

      expect(output.isSnapshotVersion).toBe(false);
      expect(output.isTaggedVersion).toBe(true);
      expect(output.strategies.npm.version).toBe("1.0.0");
    });

    it("should output YAML format when requested", async () => {
      const result = await runGitThatSemver(["-o", "yaml", "-e", "npm"], {
        CI: "true",
        GITLAB_CI: "true",
        CI_COMMIT_REF_NAME: "main",
        CI_COMMIT_SHA: currentCommitSha,
        CI_COMMIT_TAG: "v1.0.0",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("isSnapshotVersion: false");
      expect(result.stdout).toContain("isTaggedVersion: true");
      expect(result.stdout).toContain("version: 1.0.0");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid configuration gracefully", async () => {
      const result = await runGitThatSemver(
        ["-c", "invalid.config.path=value"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: currentCommitSha,
        },
      );

      // Should still exit with success but ignore invalid config
      expect(result.exitCode).toBe(0);
    });

    it("should handle missing CI environment gracefully", async () => {
      const result = await runGitThatSemver(["-e", "npm"]);

      // Should work without CI environment, but may exit with error code
      // depending on git repository state
      expect([0, 2]).toContain(result.exitCode);
    });
  });
});
