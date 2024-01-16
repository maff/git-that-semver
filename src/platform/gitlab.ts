import type { Platform } from "platform";

export class GitlabPlatform implements Platform {
  type = "gitlab";

  isSupported(): boolean {
    return Bun.env.CI === "true" && Bun.env.GITLAB_CI === "true";
  }
}
