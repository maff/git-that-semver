import type { Platform } from "../platform";
import { executeCommand as defaultExecuteCommand } from "../util/process";

type CommandExecutor = (parts: string[]) => string;

export class GitPlatform implements Platform {
  type = "git";

  constructor(private exec: CommandExecutor = defaultExecuteCommand) {}

  getCommitSha(): string {
    return this.exec(["git", "rev-parse", "HEAD"]);
  }

  getCommitRefName(): string {
    const branch = this.exec(["git", "branch", "--show-current"]);
    if (branch.length > 0) {
      return branch;
    }

    return this.exec(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
  }

  getGitTag(): string | undefined {
    try {
      return this.exec(["git", "describe", "--tags", "--exact-match", "HEAD"]);
    } catch {
      return undefined;
    }
  }

  getChangeRequestIdentifier(): string | undefined {
    return undefined;
  }
}
