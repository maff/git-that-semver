import type { Platform } from "platform";
import { env, requiredEnv } from "util/env";

export class GitLabPlatform implements Platform {
  type = "gitlab";

  getGitTag(): string {
    return env("CI_COMMIT_TAG", "");
  }

  getCommitSha(): string {
    return requiredEnv("CI_COMMIT_SHA");
  }

  getCommitRefName(): string {
    return requiredEnv("CI_COMMIT_REF_NAME");
  }

  getChangeRequestIdentifier(): string | undefined {
    const mrId = env("CI_MERGE_REQUEST_IID", "");
    if (mrId.length > 0) {
      return `mr-${mrId}`;
    }
  }

  isSupported(): boolean {
    return process.env.CI === "true" && process.env.GITLAB_CI === "true";
  }
}
