import type { Platform } from "../platform";
import { requiredEnv } from "../util/env";

export class GitHubPlatform implements Platform {
  type = "github";

  getGitTag(): string {
    if (requiredEnv("GITHUB_REF_TYPE") === "tag") {
      return requiredEnv("GITHUB_REF_NAME");
    }

    return "";
  }

  getCommitSha(): string {
    return requiredEnv("GITHUB_SHA");
  }

  getCommitRefName(): string {
    if (requiredEnv("GITHUB_EVENT_NAME") === "pull_request") {
      return requiredEnv("GITHUB_HEAD_REF");
    }

    return requiredEnv("GITHUB_REF_NAME");
  }

  getChangeRequestIdentifier(): string | undefined {
    if (requiredEnv("GITHUB_EVENT_NAME") === "pull_request") {
      const ref = requiredEnv("GITHUB_REF");
      if (ref) {
        const pr = /^refs\/pull\/(?<pr>\d+)\/merge$/.exec(ref)?.groups?.pr;
        if (pr) {
          return `pr-${pr}`;
        }
      }
    }
  }

  isSupported(): boolean {
    return process.env.CI === "true" && process.env.GITHUB_ACTIONS === "true";
  }
}
