import { expect, test, spyOn, afterEach, mock, beforeEach } from "bun:test";

import { mainLogic, cliProgram } from "../index";
import { LogLevel } from "../src/logging";
import { listTags } from "../src/util/git";
import { processUtils } from "../src/util/process";

let originalConsoleLog: any;
let consoleOutput: string[] = [];
const originalEnv = { ...process.env };

beforeEach(() => {
  // Reset console.log spy
  consoleOutput = [];
  originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    consoleOutput.push(args.map((arg) => String(arg)).join(" "));
  };
  // Reset process.env
  process.env = { ...originalEnv };
  // Ensure BUN_TEST is set so mainLogic behaves as expected for tests
  process.env.BUN_TEST = "true";
});

afterEach(() => {
  mock.restore();
  console.log = originalConsoleLog;
  process.env = { ...originalEnv };
});

test("e2e mocking executeCommand", () => {
  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    if (parts.join(" ") === "git tag -l") {
      return "mocked tag";
    }
    return "";
  });
  const tags = listTags();
  expect(tags).toEqual(["mocked tag"]);
  expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
});

test("e2e placeholder", () => {
  expect(true).toBe(true);
});

test("e2e snapshot build scenario", async () => {
  const commitSha = "d382a736cbc13965792a331af59144f357e5669e";
  const timestamp = "20240712221812";

  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "main";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.GTS_BRANCH_TYPE_MAIN = "main";

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return "";
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}`
    ) {
      return timestamp;
    }
    if (command === "git tag -l") {
      return "";
    } // Should not be called in this path, but good to have a mock
    console.error(`Unexpected command in snapshot mock: ${command}`);
    return "unexpected_snapshot_mock_call";
  });

  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: [],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java", "npm", "docker"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);

  const expectedOutputLines = [
    "GTS_IS_SNAPSHOT_VERSION=true",
    "GTS_IS_TAGGED_VERSION=false",
    "GTS_IS_SEMVER_VERSION=false",
    "GTS_IS_RELEASE_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false",
    `GTS_JAVA_VERSION=0.1.0-${timestamp}.${commitSha.substring(0, 12)}-SNAPSHOT`,
    `GTS_NPM_VERSION=0.1.0-${timestamp}.${commitSha.substring(0, 12)}`,
    `GTS_DOCKER_VERSION=0.1.0-${timestamp}.${commitSha.substring(0, 12)}`,
    `GTS_DOCKER_TAGS=0.1.0-${timestamp}.${commitSha.substring(0, 12)} ${commitSha} main`,
  ];
  for (const expectedLine of expectedOutputLines) {
    expect(consoleOutput).toContain(expectedLine);
  }
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "tag",
    "-l",
    "--sort=-version:refname",
    "--merged",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
});

test("e2e release version scenario", async () => {
  const commitSha = "d382a736cbc13965792a331af59144f357e5669e";
  const tagName = "v1.0.0";
  const timestamp = "20240712221812";

  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "main";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.CI_COMMIT_TAG = tagName;

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (command === "git tag -l") {
      return tagName;
    }
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return tagName;
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}`
    ) {
      return timestamp;
    }
    console.error(`Unexpected command in release mock: ${command}`);
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: [],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java", "npm", "docker"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  const expectedOutputLines = [
    "GTS_IS_SNAPSHOT_VERSION=false",
    "GTS_IS_TAGGED_VERSION=true",
    "GTS_IS_SEMVER_VERSION=true",
    "GTS_IS_RELEASE_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=true",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true",
    "GTS_JAVA_VERSION=1.0.0",
    "GTS_NPM_VERSION=1.0.0",
    "GTS_DOCKER_VERSION=1.0.0",
    "GTS_DOCKER_TAGS=1.0.0 1.0 1 latest",
  ];
  for (const expectedLine of expectedOutputLines) {
    expect(consoleOutput).toContain(expectedLine);
  }
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "tag",
    "-l",
    "--sort=-version:refname",
    "--merged",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
});

test("e2e pre-release version scenario", async () => {
  const commitSha = "41dad5b09561e15501dac4aa109767314c5705b4";
  const tagName = "v1.1.0-beta.1";
  const timestamp = "20240713100000";
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "main";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.CI_COMMIT_TAG = tagName;

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (command === "git tag -l") {
      return "v1.0.0\nv1.1.0-beta.1";
    }
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return tagName;
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}`
    ) {
      return timestamp;
    }
    console.error(`Unexpected command in pre-release mock: ${command}`);
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: [],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java", "npm", "docker"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  const expectedOutputLines = [
    "GTS_IS_SNAPSHOT_VERSION=false",
    "GTS_IS_TAGGED_VERSION=true",
    "GTS_IS_SEMVER_VERSION=true",
    "GTS_IS_RELEASE_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false",
    "GTS_JAVA_VERSION=1.1.0-beta.1",
    "GTS_NPM_VERSION=1.1.0-beta.1",
    "GTS_DOCKER_VERSION=1.1.0-beta.1",
    "GTS_DOCKER_TAGS=1.1.0-beta.1",
  ];
  for (const expectedLine of expectedOutputLines) {
    expect(consoleOutput).toContain(expectedLine);
  }
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "tag",
    "-l",
    "--sort=-version:refname",
    "--merged",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
});

test("e2e patch version scenario", async () => {
  const commitSha = "954a4111a94b844d758c7ef5c8a9806b53a7935b";
  const tagName = "v1.0.1";
  const timestamp = "20240714120000";
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "release/1.0.x";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.CI_COMMIT_TAG = tagName;
  process.env.GTS_BRANCH_TYPE_RELEASE = "release/.*";

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (command === "git tag -l") {
      return "v1.0.0\nv1.0.1\nv1.1.0-beta.1\nv1.1.0";
    }
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return tagName;
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}`
    ) {
      return timestamp;
    }
    console.error(`Unexpected command in patch mock: ${command}`);
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: [],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java", "npm", "docker"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  const expectedOutputLines = [
    "GTS_IS_SNAPSHOT_VERSION=false",
    "GTS_IS_TAGGED_VERSION=true",
    "GTS_IS_SEMVER_VERSION=true",
    "GTS_IS_RELEASE_SEMVER_VERSION=true",
    "GTS_IS_HIGHEST_SEMVER_VERSION=false",
    "GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false",
    "GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true",
    "GTS_JAVA_VERSION=1.0.1",
    "GTS_NPM_VERSION=1.0.1",
    "GTS_DOCKER_VERSION=1.0.1",
    "GTS_DOCKER_TAGS=1.0.1 1.0",
  ];
  for (const expectedLine of expectedOutputLines) {
    expect(consoleOutput).toContain(expectedLine);
  }
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "tag",
    "-l",
    "--sort=-version:refname",
    "--merged",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
  expect(executeCommandSpy).toHaveBeenCalledWith(["git", "tag", "-l"]);
});

test("e2e override JSON output indentation", async () => {
  const commitSha = "jsonindent001";
  const timestamp = "20240715100000";
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "main";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.GTS_BRANCH_TYPE_MAIN = "main";

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return "";
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}`
    ) {
      return timestamp;
    }
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: ["output.json.indent=4"],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java", "npm", "docker"],
    disableStrategy: [],
    outputFormat: "json",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  expect(consoleOutput.length).toBe(1);
  const jsonOutput = consoleOutput[0];
  expect(jsonOutput).toInclude('\n    "');
  try {
    const parsedJson = JSON.parse(jsonOutput);
    expect(parsedJson.isSnapshotVersion).toBe(true);
    expect(parsedJson.strategies?.java?.version).toBe(
      `0.1.0-${timestamp}.${commitSha.substring(0, 12)}-SNAPSHOT`,
    );
  } catch (e) {
    throw new Error(
      `Failed to parse JSON: ${(e as Error).message}\nOutput: ${jsonOutput}`,
    );
  }
});

test("e2e override environment variable prefix", async () => {
  const commitSha = "envprefix001";
  const timestamp = "20240715110000";
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = "main";
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.GTS_BRANCH_TYPE_MAIN = "main";

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return "";
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}` // Corrected
    ) {
      return timestamp;
    }
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: ["output.env.prefix=CUSTOM_"],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["java"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  const expectedCustomPrefixLines = [
    "CUSTOM_IS_SNAPSHOT_VERSION=true",
    `CUSTOM_JAVA_VERSION=0.1.0-${timestamp}.${commitSha.substring(0, 12)}-SNAPSHOT`,
  ];
  for (const expectedLine of expectedCustomPrefixLines) {
    expect(consoleOutput).toContain(expectedLine);
  }
  for (const line of consoleOutput) {
    expect(line.startsWith("GTS_")).toBe(false);
  }
});

test("e2e override defaults.snapshot.useChangeRequestIdentifier=false", async () => {
  const commitSha = "nochangereq01";
  const timestamp = "20240715120000";
  const refName = "my-feature-branch"; // This will be slugified to "my-feature-branch"
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = refName;
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.CI_MERGE_REQUEST_IID = "123";

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return "";
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}` // Corrected
    ) {
      return timestamp;
    }
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: ["defaults.snapshot.useChangeRequestIdentifier=false"],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["npm"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  // Corrected expectation: refName (slug) IS included when useChangeRequestIdentifier=false and not a default branch
  const expectedNpmVersion = `GTS_NPM_VERSION=0.1.0-${refName}.${timestamp}.${commitSha.substring(0, 12)}`;
  expect(consoleOutput).toContain(expectedNpmVersion);
  for (const line of consoleOutput) {
    if (line.startsWith("GTS_NPM_VERSION=")) {
      expect(line.includes("mr123")).toBe(false); // MR ID should not be present
      expect(line.includes(refName)).toBe(true); // refName (slug) should be present
    }
  }
});

test("e2e defaults.snapshot.useChangeRequestIdentifier=true (with MR)", async () => {
  const commitSha = "withchangereq01";
  const timestamp = "20240715130000";
  const refName = "my-feature-branch"; // refNameSlug, used if changeRequestIdentifier is part of template
  const mrId = "123"; // Will become "mr-123" as changeRequestIdentifier
  process.env.CI = "true";
  process.env.GITLAB_CI = "true";
  process.env.CI_COMMIT_REF_NAME = refName;
  process.env.CI_COMMIT_SHA = commitSha;
  process.env.CI_MERGE_REQUEST_IID = mrId;

  const executeCommandSpy = spyOn(processUtils, "executeCommand");
  executeCommandSpy.mockImplementation((parts: string[]) => {
    const command = parts.join(" ");
    if (
      command === `git tag -l --sort=-version:refname --merged ${commitSha}`
    ) {
      return "";
    }
    if (
      command ===
      `git show -s --format=%cd --date=format:%Y%m%d%H%M%S ${commitSha}` // Corrected
    ) {
      return timestamp;
    }
    return "";
  });
  const mockOptions = {
    configFile: "git-that-semver.yaml",
    configValue: ["defaults.snapshot.useChangeRequestIdentifier=true"],
    logLevel: "INFO" as LogLevel,
    enableStrategy: ["npm"],
    disableStrategy: [],
    outputFormat: "env",
    dumpConfig: false,
    args: [] as string[],
  };
  await mainLogic(mockOptions, cliProgram);
  // Corrected expectation based on default template analysis:
  // prefix = "0.1.0-"
  // branchIdentifierTpl = "mr-123." (since useChangeRequestIdentifier=true and CI_MERGE_REQUEST_IID is set)
  // commitIdentifierTpl = "<timestamp>.<shortSHA>"
  const expectedNpmVersionPattern = `GTS_NPM_VERSION=0.1.0-mr-${mrId}.${timestamp}.${commitSha.substring(0, 12)}`;
  let foundNpmVersion = "";
  for (const line of consoleOutput) {
    if (line.startsWith("GTS_NPM_VERSION=")) {
      foundNpmVersion = line;
      break;
    }
  }
  expect(foundNpmVersion).toBe(expectedNpmVersionPattern);
});
