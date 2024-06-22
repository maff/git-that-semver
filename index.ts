import { Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import path from "path";
import util from "util";
import { ZodError } from "zod";

import { resolveConfig } from "./src/config";
import { LogLevel, logger } from "./src/logging";
import { printVersions } from "./src/output/versionPrinter";
import { resolvePlatform } from "./src/platform";
import { resolveStrategies } from "./src/version";
import { resolveVersion } from "./src/versionResolver";

const program = new Command("git-that-semver")
  .version("0.0.1")
  .addOption(
    new Option(
      "-c, --config-file <configFile>",
      "Config file (git-that-semver.yaml)",
    )
      .env("GTS_CONFIG_FILE")
      .default("git-that-semver.yaml"),
  )
  .addOption(
    new Option("--log-level <level>", "Log level")
      .env("GTS_LOG_LEVEL")
      .default("INFO" as LogLevel)
      .choices(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"] as const),
  )
  .addOption(
    new Option(
      "-e, --enable-strategies <strategies...>",
      "Enable strategies by name",
    ).default([]),
  )
  .addOption(
    new Option(
      "-d, --disable-strategies <strategies...>",
      "Disable strategies by name",
    ).default([]),
  )
  .option("--dump-config", "Dump configuration for debug purposes")
  .configureOutput({
    writeErr: (str) =>
      process.stderr.write(`${chalk.red.bold("[ERROR]")} ${str}`),
  })
  .parse();

logger.setLevel(LogLevel[program.opts().logLevel]);

try {
  const config = await resolveConfig(
    path.resolve(program.opts().configFile),
    program.opts().enableStrategies,
    program.opts().disableStrategies,
  );

  if (program.opts().dumpConfig) {
    console.log(util.inspect(config, false, null, true));
    process.exit(0);
  }

  const platform = resolvePlatform(config.platform);
  const strategies = resolveStrategies(config.strategies);
  const result = resolveVersion(config, platform, strategies);

  printVersions(config, result);
} catch (e) {
  logger.debug("Encountered exception", e);

  let exitCode = 2;
  let errorMessage = chalk.white.bold("An unexpected error occurred.");

  if (e instanceof ZodError) {
    exitCode = 3;

    errorMessage = chalk.white.bold("Failed to parse configuration:") + "\n\n";
    errorMessage += e.errors
      .map(
        (err) =>
          chalk.red.bold(" •") +
          " " +
          chalk.white.bold(err.path.join(".") + ": ") +
          err.message,
      )
      .join("\n");
  } else if (e instanceof Error) {
    errorMessage = chalk.white.bold(e.message);
  } else if (typeof e === "string") {
    errorMessage = chalk.white.bold(e);
  }

  program.error(errorMessage, { exitCode: exitCode });
}
