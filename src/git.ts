export function listTags(): string[] {
  return executeCommand(["git", "tag", "-l"])
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function getCommitDateTime(commitSha: string): string {
  return executeCommand([
    "git",
    "show",
    "-s",
    "--format=%cd",
    "--date=format:%Y%m%d%H%M%S",
    commitSha,
  ]);
}

function executeCommand(parts: string[]): string {
  const proc = Bun.spawnSync(parts);

  if (proc.success) {
    return proc.stdout.toString().trim();
  }

  throw new Error(
    `Process exited with code ${
      proc.exitCode
    }. STDERR: ${proc.stderr.toString()}`
  );
}
