import { Command } from "@commander-js/extra-typings";
import { parseConfig } from "config";
import path from "path";
import { resolvePlatform } from "platform";
import util from "util";
import { resolveVersion } from "versionResolver";

const program = new Command("git-semantic-release")
  .version("0.0.1")
  .requiredOption("-c, --config-file <configFile>", "Config file", "gsr.toml")
  .parse();

const configFilePath = path.resolve(program.opts().configFile);

const config = await parseConfig(configFilePath);
console.log(util.inspect(config, false, null, true));

const platform = resolvePlatform(config.platform);
console.log(`Using platform ${platform.type}`);

const version = resolveVersion(config, platform);
console.log(util.inspect(version, false, null, true));
