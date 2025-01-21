import type { OutputPrinter } from ".";
import type { Config } from "../config/types";
import type { VersionResult } from "../version/versionResolver";

export class EnvOutputPrinter implements OutputPrinter {
  printResult(config: Config, versionResult: VersionResult) {
    const prefix = config.output.env.prefix;

    Object.entries({
      IS_SNAPSHOT_VERSION: versionResult.isSnapshotVersion,
      IS_TAGGED_VERSION: versionResult.isTaggedVersion,
      IS_SEMVER_VERSION: versionResult.isSemVerVersion,
      IS_RELEASE_SEMVER_VERSION: versionResult.isReleaseSemVerVersion,
      IS_HIGHEST_SEMVER_VERSION: versionResult.isHighestSemVerVersion,
      IS_HIGHEST_SEMVER_RELEASE_VERSION:
        versionResult.isHighestSemVerReleaseVersion,
      IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION:
        versionResult.isHighestSameMajorReleaseVersion,
      IS_HIGHEST_SAME_MINOR_RELEASE_VERSION:
        versionResult.isHighestSameMinorReleaseVersion,
    }).forEach(([key, value]) => {
      console.log(`${prefix}${key}=${this.valueToString(value)}`);
    });

    Object.entries(versionResult.strategies).forEach(
      ([strategyName, strategyResult]) => {
        const strategyPrefix = `${prefix}${strategyName.toUpperCase()}_`;
        Object.entries(strategyResult).forEach(([key, value]) => {
          if (key == "tags" && value.length === 0) {
            return;
          }

          console.log(
            `${strategyPrefix}${key.toUpperCase()}=${this.valueToString(value)}`,
          );
        });
      },
    );
  }

  private valueToString(value: boolean | string | string[]): string {
    if (value === true || value === false) {
      return value ? "true" : "false";
    }

    if (Array.isArray(value)) {
      if (value.length < 2) {
        return value.join(" ");
      }

      // add quotes when multiple values
      return `${value.join(" ")}`;
    }

    return value;
  }
}
