import type { PlatformAdapter } from "platform";

export class GitlabAdapter implements PlatformAdapter {
  type = "gitlab";

  isSupported(): boolean {
    return Bun.env.CI === "true" && Bun.env.GITLAB_CI === "true";
  }
}
