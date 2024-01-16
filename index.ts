import { Command } from "@commander-js/extra-typings";
import { parseConfig } from "config";
import path from "path";
import { resolvePlatform } from "platform";
import util from "util";

const program = new Command("git-semantic-release")
  .version("0.0.1")
  .requiredOption("-c, --config-file <configFile>", "Config file", "gsr.toml")
  .parse();

const configFilePath = path.resolve(program.opts().configFile);

const configFile = await parseConfig(configFilePath);
console.log(util.inspect(configFile, false, null, true));

const platform = resolvePlatform(configFile.platform);
console.log(platform);
