import type { VersionResult } from "versionResolver";

export function printVersions(versionResult: VersionResult) {
  Object.entries(versionResult.strategies).forEach(
    ([strategyName, strategyResult]) => {
      const prefix = `GSR_${strategyName.toUpperCase()}_`;
      Object.entries(strategyResult).forEach(([key, value]) => {
        console.log(`${prefix}${key.toUpperCase()}="${value}"`);
      });
    }
  );
}
