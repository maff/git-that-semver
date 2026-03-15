import type { Platform } from "../platform";

export interface ManualPlatformOptions {
  sha: string;
  refName: string;
  tag?: string;
  changeRequestId?: string;
}

export class ManualPlatform implements Platform {
  type = "manual";

  constructor(private opts: ManualPlatformOptions) {
    if (!opts.sha || !opts.refName) {
      throw new Error(
        "Manual platform requires --commit-sha and --ref-name (or GTS_COMMIT_SHA and GTS_REF_NAME)",
      );
    }
  }

  getCommitSha(): string {
    return this.opts.sha;
  }

  getCommitRefName(): string {
    return this.opts.refName;
  }

  getGitTag(): string | undefined {
    return this.opts.tag;
  }

  getChangeRequestIdentifier(): string | undefined {
    return this.opts.changeRequestId;
  }
}
