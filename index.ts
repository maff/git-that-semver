import { Command, Option } from "@commander-js/extra-typings";
import { parseConfig } from "config";
import { printVersions } from "output/versionPrinter";
import log from "loglevel";
import path from "path";
import { resolvePlatform } from "platform";
import util from "util";
import { resolveStrategies } from "version";
import { resolveVersion } from "versionResolver";

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

const configFilePath = path.resolve(program.opts().configFile);

const config = await parseConfig(configFilePath);
if (program.opts().dumpConfig) {
  console.log(util.inspect(config, false, null, true));
  process.exit(0);
}

const platform = resolvePlatform(config.platform);
const strategies = resolveStrategies(config.strategies);
const result = resolveVersion(config, platform, strategies);

printVersions(config, result);
