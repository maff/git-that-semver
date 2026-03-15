import { Command, Option } from "@commander-js/extra-typings";
import path from "path";
import YAML from "yaml";
import { ZodError } from "zod";

import { resolveConfig } from "./src/config";
import { style, LogLevel, logger } from "./src/logging";
import { resolveOutputPrinter } from "./src/output";
import { resolvePlatform } from "./src/platform";
import { resolveVersion } from "./src/version/versionResolver";
import { resolveStrategies } from "./src/version/versionStrategy";

declare const __GTS_VERSION__: string;
const gtsVersion =
  typeof __GTS_VERSION__ !== "undefined" ? __GTS_VERSION__ : "dev";

const program = new Command("git-that-semver")
  .version(gtsVersion)
  .addOption(
    new Option(
      "-f, --config-file <config-file>",
      "Config file (git-that-semver.yaml)",
    )
      .env("GTS_CONFIG_FILE")
      .default("git-that-semver.yaml"),
  )
  .addOption(
    new Option(
      "-c, --config-value <config-values...>",
      "Override config values (e.g. output.json.indent=2)",
    ).default([]),
  )
  .addOption(
    new Option("--log-level <level>", "Log level")
      .env("GTS_LOG_LEVEL")
      .default("INFO" as LogLevel)
      .choices(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"] as const),
  )
  .addOption(
    new Option(
      "-e, --enable-strategy <strategies...>",
      "Enable strategies by name",
    ).default([]),
  )
  .addOption(
    new Option(
      "-d, --disable-strategy <strategies...>",
      "Disable strategies by name",
    ).default([]),
  )
  .addOption(
    new Option("-o, --output-format <format>", "Output format")
      .env("GTS_OUTPUT_FORMAT")
      .default("env")
      .choices(["env", "json", "yaml"] as const),
  )
  .addOption(
    new Option("--platform <platform>", "Platform type")
      .env("GTS_PLATFORM")
      .choices(["auto", "github", "gitlab", "git", "manual"] as const),
  )
  .addOption(
    new Option("--commit-sha <sha>", "Commit SHA (manual platform)").env(
      "GTS_COMMIT_SHA",
    ),
  )
  .addOption(
    new Option("--ref-name <name>", "Branch/tag name (manual platform)").env(
      "GTS_REF_NAME",
    ),
  )
  .addOption(
    new Option("--git-tag <tag>", "Git tag (manual platform)").env(
      "GTS_GIT_TAG",
    ),
  )
  .addOption(
    new Option(
      "--change-request-id <id>",
      "Change request identifier (manual platform)",
    ).env("GTS_CHANGE_REQUEST_ID"),
  )
  .option("--dump-config", "Dump configuration for debug purposes")
  .configureOutput({
    writeErr: (str) =>
      process.stderr.write(`${style.red.bold("[ERROR]")} ${str}`),
  })
  .parse();

logger.setLevel(LogLevel[program.opts().logLevel]);

try {
  const config = await resolveConfig(
    path.resolve(program.opts().configFile),
    [...program.opts().enableStrategy],
    [...program.opts().disableStrategy],
    program.opts().outputFormat,
    [...program.opts().configValue],
  );

  if (program.opts().dumpConfig) {
    logger.info("Dumping resolved config file as --dump-config was passed");

    let configOutputFormat = program.opts().outputFormat;
    if (configOutputFormat === "env") {
      logger.info(
        "Selected output format is 'env' which is not supported for config dump, using YAML instead",
      );

      configOutputFormat = "yaml";
    }

    if (configOutputFormat === "json") {
      console.log(JSON.stringify(config, null, 2));
    } else if (configOutputFormat === "yaml") {
      console.log(YAML.stringify(config));
    }

    process.exit(0);
  }

  const opts = program.opts();
  const platformType = opts.platform ?? config.platform;

  const hasManualOpts = !!(
    opts.commitSha ||
    opts.refName ||
    opts.gitTag ||
    opts.changeRequestId
  );
  const manualOpts = hasManualOpts
    ? {
        sha: opts.commitSha!,
        refName: opts.refName!,
        tag: opts.gitTag,
        changeRequestId: opts.changeRequestId,
      }
    : undefined;

  const platform = resolvePlatform(platformType, manualOpts);
  const strategies = resolveStrategies(config.strategies);
  const result = resolveVersion(config, platform, strategies);

  const outputPrinter = resolveOutputPrinter(config);
  outputPrinter.printResult(config, result);
} catch (e) {
  logger.debug("Encountered exception", e);

  let exitCode = 2;
  let errorMessage = style.white.bold("An unexpected error occurred.");

  if (e instanceof ZodError) {
    exitCode = 3;

    errorMessage = style.white.bold("Failed to parse configuration:") + "\n\n";
    errorMessage += e.issues
      .map(
        (err) =>
          style.red.bold(" •") +
          " " +
          style.white.bold(err.path.join(".") + ": ") +
          err.message,
      )
      .join("\n");
  } else if (e instanceof Error) {
    errorMessage = style.white.bold(e.message);
  } else if (typeof e === "string") {
    errorMessage = style.white.bold(e);
  }

  program.error(errorMessage, { exitCode: exitCode });
}
