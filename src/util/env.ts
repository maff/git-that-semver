export function env(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
}

export function numberEnv(key: string, defaultValue = 0): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }

  return parseInt(value, 10);
}

export function requiredNumberEnv(key: string): number {
  return parseInt(requiredEnv(key), 10);
}
