import { spawn } from "bun";
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "../..");
const entryPoint = path.resolve(projectRoot, "index.ts");

// --- Test helpers ---

type TestCommit = { message: string; tag?: string };

async function createTestRepo(options: {
  commits: TestCommit[];
}): Promise<{ path: string; cleanup: () => void; shas: string[] }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gts-test-"));

  const run = async (cmd: string[], cwd: string) => {
    const proc = spawn({
      cmd,
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@test.com",
        GIT_AUTHOR_DATE: "2025-01-15T12:00:00+00:00",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@test.com",
        GIT_COMMITTER_DATE: "2025-01-15T12:00:00+00:00",
      },
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(
        `Command failed: ${cmd.join(" ")}\nstdout: ${stdout}\nstderr: ${stderr}`,
      );
    }
    return stdout.trim();
  };

  await run(["git", "init", "-b", "main"], tmpDir);
  await run(["git", "config", "user.email", "test@test.com"], tmpDir);
  await run(["git", "config", "user.name", "Test"], tmpDir);

  const shas: string[] = [];
  for (const commit of options.commits) {
    await run(["git", "commit", "--allow-empty", "-m", commit.message], tmpDir);
    const sha = await run(["git", "rev-parse", "HEAD"], tmpDir);
    shas.push(sha);
    if (commit.tag) {
      await run(["git", "tag", commit.tag], tmpDir);
    }
  }

  return {
    path: tmpDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
    shas,
  };
}

async function runGTS(
  args: string[],
  env: Record<string, string>,
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cleanEnv: Record<string, string> = {
    PATH: process.env["PATH"]!,
    HOME: process.env["HOME"]!,
  };

  const proc = spawn({
    cmd: ["bun", "run", entryPoint, ...args],
    cwd,
    env: { ...cleanEnv, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

function parseEnvOutput(stdout: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of stdout.trim().split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      result[line.substring(0, eqIdx)] = line.substring(eqIdx + 1);
    }
  }
  return result;
}

// --- Tests ---

describe("git-that-semver e2e tests", () => {
  let testRepo: { path: string; cleanup: () => void; shas: string[] };

  afterEach(() => {
    testRepo?.cleanup();
  });

  describe("GitLab CI", () => {
    const gitlabBase = {
      CI: "true",
      GITLAB_CI: "true",
    };

    it("snapshot build - untagged commit", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "initial", tag: "v1.0.0" },
          { message: "feature work" },
        ],
      });
      const sha = testRepo.shas[1];

      const result = await runGTS(
        ["-e", "docker", "-e", "npm"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["GTS_IS_TAGGED_VERSION"]).toBe("false");
      expect(env["GTS_IS_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("false");
      // Fixed GIT_COMMITTER_DATE → deterministic datetime in version
      expect(env["GTS_DOCKER_VERSION"]).toMatch(
        /^1\.1\.0-20250115120000\.[0-9a-f]{12}$/,
      );
      expect(env["GTS_NPM_VERSION"]).toMatch(
        /^1\.1\.0-20250115120000\.[0-9a-f]{12}$/,
      );
      expect(env["GTS_DOCKER_TAGS"]).toContain(sha);
    });

    it("release version - tagged v1.0.0 as only tag", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-e", "docker", "-e", "npm"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("false");
      expect(env["GTS_IS_TAGGED_VERSION"]).toBe("true");
      expect(env["GTS_IS_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.0.0");
      expect(env["GTS_NPM_VERSION"]).toBe("1.0.0");
    });

    it("pre-release version - tagged v1.1.0-beta.1", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "release", tag: "v1.0.0" },
          { message: "beta", tag: "v1.1.0-beta.1" },
        ],
      });
      const sha = testRepo.shas[1];

      const result = await runGTS(
        ["-e", "docker"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.1.0-beta.1",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("false");
      expect(env["GTS_IS_TAGGED_VERSION"]).toBe("true");
      expect(env["GTS_IS_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.1.0-beta.1");
    });

    it("patch version - not highest when higher exists", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "initial", tag: "v1.0.0" },
          { message: "minor", tag: "v1.1.0" },
          { message: "patch", tag: "v1.0.1" },
        ],
      });
      const sha = testRepo.shas[2];

      const result = await runGTS(
        ["-e", "docker"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "release/1.0.x",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.1",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.0.1");
    });

    it("config overrides - custom prefix", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-e", "npm", "-c", "output.env.prefix=CUSTOM_"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["CUSTOM_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["CUSTOM_NPM_VERSION"]).toBeDefined();
      expect(env["CUSTOM_DOCKER_VERSION"]).toBeDefined();
    });

    it("output format - JSON", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-o", "json", "-e", "npm"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.isSnapshotVersion).toBe(false);
      expect(output.isTaggedVersion).toBe(true);
      expect(output.isSemVerVersion).toBe(true);
      expect(output.isReleaseSemVerVersion).toBe(true);
      expect(output.strategies.docker.version).toBe("1.0.0");
      expect(output.strategies.npm.version).toBe("1.0.0");
      expect(Array.isArray(output.strategies.docker.tags)).toBe(true);
    });

    it("output format - YAML", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-o", "yaml", "-e", "npm"],
        {
          ...gitlabBase,
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("isSnapshotVersion: false");
      expect(result.stdout).toContain("isTaggedVersion: true");
      expect(result.stdout).toContain("isSemVerVersion: true");
      expect(result.stdout).toContain("version: 1.0.0");
    });
  });

  describe("GitHub Actions", () => {
    const githubBase = {
      CI: "true",
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF_TYPE: "branch",
    };

    it("snapshot build", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "initial", tag: "v1.0.0" },
          { message: "feature work" },
        ],
      });
      const sha = testRepo.shas[1];

      const result = await runGTS(
        ["-e", "docker", "-e", "npm"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "main",
          GITHUB_SHA: sha,
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["GTS_IS_TAGGED_VERSION"]).toBe("false");
      expect(env["GTS_DOCKER_VERSION"]).toMatch(
        /^1\.1\.0-20250115120000\.[0-9a-f]{12}$/,
      );
      expect(env["GTS_NPM_VERSION"]).toMatch(
        /^1\.1\.0-20250115120000\.[0-9a-f]{12}$/,
      );
    });

    it("release version", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v2.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-e", "docker", "-e", "npm"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "v2.0.0",
          GITHUB_SHA: sha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v2.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_TAGGED_VERSION"]).toBe("true");
      expect(env["GTS_IS_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toBe("2.0.0");
      expect(env["GTS_NPM_VERSION"]).toBe("2.0.0");
    });

    it("pre-release version", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "release", tag: "v1.0.0" },
          { message: "beta", tag: "v1.1.0-rc.1" },
        ],
      });
      const sha = testRepo.shas[1];

      const result = await runGTS(
        ["-e", "docker"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "v1.1.0-rc.1",
          GITHUB_SHA: sha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.1.0-rc.1",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.1.0-rc.1");
    });

    it("patch version - not highest when higher exists", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "initial", tag: "v1.0.0" },
          { message: "minor", tag: "v1.1.0" },
          { message: "patch", tag: "v1.0.1" },
        ],
      });
      const sha = testRepo.shas[2];

      const result = await runGTS(
        ["-e", "docker"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "v1.0.1",
          GITHUB_SHA: sha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.0.1",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_RELEASE_SEMVER_VERSION"]).toBe("true");
      expect(env["GTS_IS_HIGHEST_SEMVER_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION"]).toBe("false");
      expect(env["GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.0.1");
    });

    it("PR context with change request identifier", async () => {
      testRepo = await createTestRepo({
        commits: [
          { message: "initial", tag: "v1.0.0" },
          { message: "pr work" },
        ],
      });
      const sha = testRepo.shas[1];

      const result = await runGTS(
        ["-e", "docker"],
        {
          ...githubBase,
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/42/merge",
          GITHUB_REF_NAME: "42/merge",
          GITHUB_SHA: sha,
          GITHUB_HEAD_REF: "feature/cool-thing",
          GITHUB_BASE_REF: "main",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toContain("pr-42");
    });

    it("config overrides - custom prefix", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-e", "npm", "-c", "output.env.prefix=CUSTOM_"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "main",
          GITHUB_SHA: sha,
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["CUSTOM_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["CUSTOM_NPM_VERSION"]).toBeDefined();
      expect(env["CUSTOM_DOCKER_VERSION"]).toBeDefined();
    });

    it("output format - JSON", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-o", "json", "-e", "npm"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "v1.0.0",
          GITHUB_SHA: sha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.isSnapshotVersion).toBe(false);
      expect(output.isTaggedVersion).toBe(true);
      expect(output.strategies.docker.version).toBe("1.0.0");
      expect(output.strategies.npm.version).toBe("1.0.0");
    });

    it("output format - YAML", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "release", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-o", "yaml", "-e", "npm"],
        {
          ...githubBase,
          GITHUB_REF_NAME: "v1.0.0",
          GITHUB_SHA: sha,
          GITHUB_REF_TYPE: "tag",
          GITHUB_REF: "refs/tags/v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("isSnapshotVersion: false");
      expect(result.stdout).toContain("isTaggedVersion: true");
      expect(result.stdout).toContain("version: 1.0.0");
    });
  });

  describe("configuration", () => {
    it("custom config file", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const configPath = path.join(testRepo.path, "custom-gts.yaml");
      fs.writeFileSync(
        configPath,
        `strategies:
  python:
    enabled: true
output:
  env:
    prefix: MY_
`,
      );

      const result = await runGTS(
        ["-f", configPath],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);
      expect(env["MY_IS_TAGGED_VERSION"]).toBe("true");
      expect(env["MY_DOCKER_VERSION"]).toBe("1.0.0");
      expect(env["MY_PYTHON_VERSION"]).toBe("1.0.0");
    });

    it("multiple strategies enabled", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial", tag: "v1.0.0" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-e", "java", "-e", "npm", "-e", "docker"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
          CI_COMMIT_TAG: "v1.0.0",
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);
      expect(env["GTS_DOCKER_VERSION"]).toBe("1.0.0");
      expect(env["GTS_NPM_VERSION"]).toBe("1.0.0");
      expect(env["GTS_JAVA_VERSION"]).toBe("1.0.0");
    });
  });

  describe("error handling", () => {
    it("should handle invalid config path gracefully", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial" }],
      });
      const sha = testRepo.shas[0];

      const result = await runGTS(
        ["-c", "invalid.config.path=value"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: sha,
        },
        testRepo.path,
      );

      expect(result.exitCode).toBe(0);
    });

    it("should exit with error when no CI environment is detected", async () => {
      testRepo = await createTestRepo({
        commits: [{ message: "initial" }],
      });

      const result = await runGTS(["-e", "npm"], {}, testRepo.path);

      expect(result.exitCode).toBe(2);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe("real repo - date parsing", () => {
    // Tests against a known commit in this repo to verify real git date parsing
    // works correctly (not just the synthetic dates in temp repos).
    const knownCommitSha = "a84bc7cab7ec01a3827c1d2841e8c4e3b5a0986b";
    const expectedDateTime = "20250123134343";

    it("should parse real commit datetime correctly", async () => {
      const result = await runGTS(
        ["-e", "npm"],
        {
          CI: "true",
          GITLAB_CI: "true",
          CI_COMMIT_REF_NAME: "main",
          CI_COMMIT_SHA: knownCommitSha,
        },
        projectRoot,
      );

      expect(result.exitCode).toBe(0);
      const env = parseEnvOutput(result.stdout);

      expect(env["GTS_IS_SNAPSHOT_VERSION"]).toBe("true");
      expect(env["GTS_DOCKER_VERSION"]).toContain(expectedDateTime);
      expect(env["GTS_NPM_VERSION"]).toContain(expectedDateTime);
    });
  });
});
