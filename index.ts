import { Command, Option } from "@commander-js/extra-typings";
import { parseConfig } from "config";
import { printVersions } from "output/versionPrinter";
import log from "loglevel";
import path from "path";
import { resolvePlatform } from "platform";
import util from "util";
import { resolveStrategies } from "version";
import { resolveVersion } from "versionResolver";
import chalk from "chalk";
import { ZodError } from "zod";

const program = new Command("git-that-semver")
  .version("0.0.1")
  .addOption(
    new Option(
      "-c, --config-file <configFile>",
      "Config file (git-that-semver.yaml)"
    )
      .env("GTS_CONFIG_FILE")
      .default("git-that-semver.yaml")
  )
  .addOption(
    new Option("--log-level <level>", "Log level")
      .env("GTS_LOG_LEVEL")
      .default("info" as const)
      .choices(["trace", "debug", "info", "warn", "error"] as const)
  )
  .option("--dump-config", "Dump configuration for debug purposes")
  .parse();

log.setDefaultLevel(program.opts().logLevel);

try {
  const config = await parseConfig(path.resolve(program.opts().configFile));
  if (program.opts().dumpConfig) {
    console.log(util.inspect(config, false, null, true));
    process.exit(0);
  }

  const platform = resolvePlatform(config.platform);
  const strategies = resolveStrategies(config.strategies);
  const result = resolveVersion(config, platform, strategies);

  printVersions(config, result);
} catch (e) {
  log.debug("Encountered exception");
  log.debug(e);

  let exitCode = 1;
  let errorMessage = chalk.white.bold("An unexpected error occurred.");

  if (e instanceof ZodError) {
    exitCode = 2;

    errorMessage = chalk.white.bold("Failed to parse configuration:") + "\n\n";
    errorMessage += e.errors
      .map(
        (err) =>
          chalk.red.bold(" •") +
          " " +
          chalk.white.bold(err.path.join(".") + ": ") +
          err.message
      )
      .join("\n");
  } else if (e instanceof Error) {
    errorMessage = chalk.white.bold(e.message);
  } else if (typeof e === "string") {
    errorMessage = chalk.white.bold(e);
  }

  console.error(chalk.red.bold("ERROR:") + " " + errorMessage);
  process.exit(exitCode);
}
