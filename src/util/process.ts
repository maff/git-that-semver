export function executeCommand(parts: string[]): string {
  const proc = Bun.spawnSync(parts);

  if (proc.success) {
    return proc.stdout.toString().trim();
  }

  throw new Error(
    `Process exited with code ${
      proc.exitCode
    }. STDERR: ${proc.stderr.toString()}`,
  );
}
