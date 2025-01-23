import { set } from "lodash-es";

import { logger } from "../logging";

const configLogger = logger.childLogger("config");

function parseConfigOverride(override: string): { path: string; value: any } {
  if (!/^[^=]+=[^=]*$/.test(override)) {
    throw new Error(
      `Invalid config value format: ${override}. Expected format: path.to.config=value`,
    );
  }

  const [path, value] = override.split("=", 2);
  return { path, value: parseValue(value) };
}

function parseValue(value: string | undefined): any {
  if (value === undefined) {
    return undefined;
  }

  // Handle boolean values
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Handle array values (JSON array syntax)
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new Error(
        `Invalid array format: ${value}. Expected JSON array format like [value1,value2]`,
      );
    }
  }

  // Handle numeric values
  const numValue = Number(value);
  if (!isNaN(numValue) && value.trim() !== "") {
    return numValue;
  }

  // Return as string if no other type matches
  return value;
}

export function applyConfigOverrides(
  config: Record<string, any>,
  overrides: string[],
): Record<string, any> {
  const result = { ...config };

  for (const override of overrides) {
    const { path, value } = parseConfigOverride(override);
    configLogger.trace("Applying config override", { path, value });
    set(result, path, value);
  }

  return result;
}
