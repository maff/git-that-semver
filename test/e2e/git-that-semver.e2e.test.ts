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
  // Use fixed past commit with predictable timestamp for deterministic tests
  const testCommitSha = "a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b"; // Full SHA as provided by CI
  const testCommitShortSha = "a84bc7cab7ec"; // 12-char SHA for version strings
  const testCommitTimestamp = "20250123134343";

  describe("GitLab CI", () => {
    const gitlabEnv = {
      CI: "true",
      GITLAB_CI: "true",
    };

    describe("Snapshot build (README example 1)", () => {
      it("should generate snapshot versions when on untagged commit", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...gitlabEnv,
            CI_COMMIT_REF_NAME: "main",
            CI_COMMIT_SHA: testCommitSha,
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=true
GTS_IS_TAGGED_VERSION=false
GTS_IS_SEMVER_VERSION=false
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=0.8.0-20250123134343.a84bc7cab7ec-SNAPSHOT
GTS_NPM_VERSION=0.8.0-20250123134343.a84bc7cab7ec
GTS_DOCKER_VERSION=0.8.0-20250123134343.a84bc7cab7ec
GTS_DOCKER_TAGS=0.8.0-20250123134343.a84bc7cab7ec a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b main
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Release version (README example 2)", () => {
      it("should generate release versions when on tagged commit", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...gitlabEnv,
            CI_COMMIT_REF_NAME: "main",
            CI_COMMIT_SHA: testCommitSha,
            CI_COMMIT_TAG: "v1.0.0",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.0
GTS_NPM_VERSION=1.0.0
GTS_DOCKER_VERSION=1.0.0
GTS_DOCKER_TAGS=1.0.0 1.0 1
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Pre-release version (README example 3)", () => {
      it("should generate pre-release versions with beta tag", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...gitlabEnv,
            CI_COMMIT_REF_NAME: "main",
            CI_COMMIT_SHA: testCommitSha,
            CI_COMMIT_TAG: "v1.1.0-beta.1",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=1.1.0-beta.1
GTS_NPM_VERSION=1.1.0-beta.1
GTS_DOCKER_VERSION=1.1.0-beta.1
GTS_DOCKER_TAGS=1.1.0-beta.1
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Patch version (README example 4)", () => {
      it("should generate patch versions on release branch", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...gitlabEnv,
            CI_COMMIT_REF_NAME: "release/1.0.x",
            CI_COMMIT_SHA: testCommitSha,
            CI_COMMIT_TAG: "v1.0.1",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.1
GTS_NPM_VERSION=1.0.1
GTS_DOCKER_VERSION=1.0.1
GTS_DOCKER_TAGS=1.0.1 1.0 1
`;

        expect(result.stdout).toBe(expectedOutput);
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
            ...gitlabEnv,
            CI_COMMIT_REF_NAME: "main",
            CI_COMMIT_SHA: testCommitSha,
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `CUSTOM_IS_SNAPSHOT_VERSION=true
CUSTOM_IS_TAGGED_VERSION=false
CUSTOM_IS_SEMVER_VERSION=false
CUSTOM_IS_RELEASE_SEMVER_VERSION=false
CUSTOM_IS_HIGHEST_SEMVER_VERSION=false
CUSTOM_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
CUSTOM_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
CUSTOM_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
CUSTOM_DOCKER_VERSION=0.8.0-20250123134343.a84bc7cab7ec
CUSTOM_DOCKER_TAGS=0.8.0-20250123134343.a84bc7cab7ec a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b main
CUSTOM_NPM_VERSION=0.8.0-20250123134343.a84bc7cab7ec
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Output formats", () => {
      it("should output JSON format when requested", async () => {
        const result = await runGitThatSemver(["-o", "json", "-e", "npm"], {
          ...gitlabEnv,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: testCommitSha,
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
          ...gitlabEnv,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: testCommitSha,
          CI_COMMIT_TAG: "v1.0.0",
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("isSnapshotVersion: false");
        expect(result.stdout).toContain("isTaggedVersion: true");
        expect(result.stdout).toContain("version: 1.0.0");
      });
    });
  });

  describe("GitHub Actions", () => {
    const githubEnv = {
      CI: "true",
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF_TYPE: "branch",
    };

    describe("Snapshot build (README example 1)", () => {
      it("should generate snapshot versions when on untagged commit", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...githubEnv,
            GITHUB_REF_NAME: "main",
            GITHUB_SHA: testCommitSha,
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=true
GTS_IS_TAGGED_VERSION=false
GTS_IS_SEMVER_VERSION=false
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=0.8.0-20250123134343.a84bc7cab7ec-SNAPSHOT
GTS_NPM_VERSION=0.8.0-20250123134343.a84bc7cab7ec
GTS_DOCKER_VERSION=0.8.0-20250123134343.a84bc7cab7ec
GTS_DOCKER_TAGS=0.8.0-20250123134343.a84bc7cab7ec a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b main
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Release version (README example 2)", () => {
      it("should generate release versions when on tagged commit", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...githubEnv,
            GITHUB_REF_NAME: "v1.0.0",
            GITHUB_SHA: testCommitSha,
            GITHUB_REF_TYPE: "tag",
            GITHUB_REF: "refs/tags/v1.0.0",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.0
GTS_NPM_VERSION=1.0.0
GTS_DOCKER_VERSION=1.0.0
GTS_DOCKER_TAGS=1.0.0 1.0 1
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Pre-release version (README example 3)", () => {
      it("should generate pre-release versions with beta tag", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...githubEnv,
            GITHUB_REF_NAME: "v1.1.0-beta.1",
            GITHUB_SHA: testCommitSha,
            GITHUB_REF_TYPE: "tag",
            GITHUB_REF: "refs/tags/v1.1.0-beta.1",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=1.1.0-beta.1
GTS_NPM_VERSION=1.1.0-beta.1
GTS_DOCKER_VERSION=1.1.0-beta.1
GTS_DOCKER_TAGS=1.1.0-beta.1
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Patch version (README example 4)", () => {
      it("should generate patch versions on release branch", async () => {
        const result = await runGitThatSemver(
          ["-e", "java", "-e", "npm", "-e", "docker"],
          {
            ...githubEnv,
            GITHUB_REF_NAME: "v1.0.1",
            GITHUB_SHA: testCommitSha,
            GITHUB_REF_TYPE: "tag",
            GITHUB_REF: "refs/tags/v1.0.1",
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.1
GTS_NPM_VERSION=1.0.1
GTS_DOCKER_VERSION=1.0.1
GTS_DOCKER_TAGS=1.0.1 1.0 1
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Pull Request context", () => {
      it("should generate snapshot versions with PR identifier", async () => {
        const result = await runGitThatSemver(["-e", "npm"], {
          ...githubEnv,
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/30/merge",
          GITHUB_REF_NAME: "30/merge",
          GITHUB_SHA: testCommitSha,
          GITHUB_HEAD_REF: "feature/test-branch",
          GITHUB_BASE_REF: "main",
        });

        expect(result.exitCode).toBe(0);

        const expectedOutput = `GTS_IS_SNAPSHOT_VERSION=true
GTS_IS_TAGGED_VERSION=false
GTS_IS_SEMVER_VERSION=false
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_DOCKER_VERSION=0.8.0-pr-30.20250123134343.a84bc7cab7ec
GTS_DOCKER_TAGS=0.8.0-pr-30.20250123134343.a84bc7cab7ec a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b
GTS_NPM_VERSION=0.8.0-pr-30.20250123134343.a84bc7cab7ec
`;

        expect(result.stdout).toBe(expectedOutput);
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
            ...githubEnv,
            GITHUB_REF_NAME: "main",
            GITHUB_SHA: testCommitSha,
          },
        );

        expect(result.exitCode).toBe(0);

        const expectedOutput = `CUSTOM_IS_SNAPSHOT_VERSION=true
CUSTOM_IS_TAGGED_VERSION=false
CUSTOM_IS_SEMVER_VERSION=false
CUSTOM_IS_RELEASE_SEMVER_VERSION=false
CUSTOM_IS_HIGHEST_SEMVER_VERSION=false
CUSTOM_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
CUSTOM_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
CUSTOM_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
CUSTOM_DOCKER_VERSION=0.8.0-20250123134343.a84bc7cab7ec
CUSTOM_DOCKER_TAGS=0.8.0-20250123134343.a84bc7cab7ec a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b main
CUSTOM_NPM_VERSION=0.8.0-20250123134343.a84bc7cab7ec
`;

        expect(result.stdout).toBe(expectedOutput);
      });
    });

    describe("Output formats", () => {
      it("should output JSON format when requested", async () => {
        const result = await runGitThatSemver(["-o", "json", "-e", "npm"], {
          ...githubEnv,
          GITHUB_REF_NAME: "v1.0.0",
          GITHUB_SHA: testCommitSha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.0.0",
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
          ...githubEnv,
          GITHUB_REF_NAME: "v1.0.0",
          GITHUB_SHA: testCommitSha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.0.0",
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("isSnapshotVersion: false");
        expect(result.stdout).toContain("isTaggedVersion: true");
        expect(result.stdout).toContain("version: 1.0.0");
      });
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
          CI_COMMIT_SHA: testCommitSha,
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
