import type { Platform } from "../platform";
import * as processUtil from "../util/process";

export class GitPlatform implements Platform {
  type = "git";

  getCommitSha(): string {
    return processUtil.executeCommand(["git", "rev-parse", "HEAD"]);
  }

  getCommitRefName(): string {
    const branch = processUtil.executeCommand([
      "git",
      "branch",
      "--show-current",
    ]);
    if (branch.length > 0) {
      return branch;
    }

    return processUtil.executeCommand([
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
  }

  getGitTag(): string | undefined {
    try {
      return processUtil.executeCommand([
        "git",
        "describe",
        "--tags",
        "--exact-match",
        "HEAD",
      ]);
    } catch {
      return undefined;
    }
  }

  getChangeRequestIdentifier(): string | undefined {
    return undefined;
  }
}
