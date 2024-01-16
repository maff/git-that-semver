import type { PlatformAdapter } from "platforms";

export class GitlabAdapter implements PlatformAdapter {
  type = "gitlab";

  isSupported(): boolean {
    return Bun.env.CI === "true" && Bun.env.GITLAB_CI === "true";
  }
}
