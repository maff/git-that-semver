import { processUtils } from "./process";

export function listTags(): string[] {
  return processUtils
    .executeCommand(["git", "tag", "-l"])
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function listTagsBeforeCommit(commitSha: string): string[] {
  return processUtils
    .executeCommand([
      "git",
      "tag",
      "-l",
      "--sort=-version:refname",
      "--merged",
      commitSha,
    ])
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function getCommitDateTime(commitSha: string): string {
  return processUtils.executeCommand([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
}
