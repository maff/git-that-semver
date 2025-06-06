import { Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import path from "path";
import YAML from "yaml";
import { ZodError } from "zod";

import { resolveConfig } from "./src/config";
import { LogLevel, logger } from "./src/logging";
import { resolveOutputPrinter } from "./src/output";
import { resolvePlatform } from "./src/platform";
import { resolveVersion } from "./src/version/versionResolver";
import { resolveStrategies } from "./src/version/versionStrategy";

const program = new Command("git-that-semver")
  .version("0.0.1")
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
  .option("--dump-config", "Dump configuration for debug purposes")
  .configureOutput({
    writeErr: (str) =>
      process.stderr.write(`${chalk.red.bold("[ERROR]")} ${str}`),
  })
  .allowExcessArguments(true) // TODO revisit why this is needed after the commander 13 upgrade
  .parse();

// Define a type for parsed options for clarity, based on program.opts()
// This might need to be more specific based on actual options.
type ParsedOptions = ReturnType<typeof program.parse>["opts"];

export async function mainLogic(options: ParsedOptions, cmdInstance: Command) {
  logger.setLevel(LogLevel[options.logLevel]);

  try {
    const config = await resolveConfig(
      path.resolve(options.configFile),
      [...options.enableStrategy],
      [...options.disableStrategy],
      options.outputFormat,
      [...options.configValue],
    );

    if (options.dumpConfig) {
      logger.info("Dumping resolved config file as --dump-config was passed");

      let configOutputFormat = options.outputFormat;
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

      if (!process.env.BUN_TEST) {
        process.exit(0);
      }
      return; // Return for testability
    }

    const platform = resolvePlatform(config.platform);
    const strategies = resolveStrategies(config.strategies);
    const result = resolveVersion(config, platform, strategies);

    const outputPrinter = resolveOutputPrinter(config);
    // In a test context, we might want to capture this instead of printing
    if (process.env.BUN_TEST) {
      // For testing, let's assume the test will spy on console.log or capture stdout
      outputPrinter.printResult(config, result);
    } else {
      outputPrinter.printResult(config, result);
    }
  } catch (e) {
    logger.debug("Encountered exception", e);

    let exitCode = 2;
    let errorMessage = chalk.white.bold("An unexpected error occurred.");

    if (e instanceof ZodError) {
      exitCode = 3;
      errorMessage =
        chalk.white.bold("Failed to parse configuration:") + "\n\n";
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

    if (process.env.BUN_TEST) {
      // Re-throw the error for test assertions
      const testError = new Error(errorMessage);
      // @ts-ignore
      testError.exitCode = exitCode;
      throw testError;
    } else {
      cmdInstance.error(errorMessage, { exitCode: exitCode });
    }
  }
}

if (import.meta.main) {
  // program is already parsed at the top level
  mainLogic(program.opts() as ParsedOptions, program);
}

export { program as cliProgram };
