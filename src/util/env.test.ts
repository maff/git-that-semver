import { expect, test, describe, beforeEach, afterEach } from "bun:test";

import { env, requiredEnv, numberEnv, requiredNumberEnv } from "./env";

describe("env utilities", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe("env", () => {
    test("returns environment variable when set", () => {
      process.env["TEST_KEY"] = "test-value";
      expect(env("TEST_KEY", "default")).toBe("test-value");
    });

    test("returns default value when environment variable is not set", () => {
      expect(env("NONEXISTENT_KEY", "default")).toBe("default");
    });
  });

  describe("requiredEnv", () => {
    test("returns environment variable when set", () => {
      process.env["REQUIRED_KEY"] = "required-value";
      expect(requiredEnv("REQUIRED_KEY")).toBe("required-value");
    });

    test("throws error when environment variable is not set", () => {
      expect(() => requiredEnv("NONEXISTENT_KEY")).toThrow(
        "Required environment variable NONEXISTENT_KEY is not set",
      );
    });
  });

  describe("numberEnv", () => {
    test("returns parsed number when environment variable is set", () => {
      process.env["NUMBER_KEY"] = "123";
      expect(numberEnv("NUMBER_KEY")).toBe(123);
    });

    test("returns default value when environment variable is not set", () => {
      expect(numberEnv("NONEXISTENT_KEY", 42)).toBe(42);
    });

    test("returns 0 when environment variable is not set and no default provided", () => {
      expect(numberEnv("NONEXISTENT_KEY")).toBe(0);
    });
  });

  describe("requiredNumberEnv", () => {
    test("returns parsed number when environment variable is set", () => {
      process.env["REQUIRED_NUMBER_KEY"] = "456";
      expect(requiredNumberEnv("REQUIRED_NUMBER_KEY")).toBe(456);
    });

    test("throws error when environment variable is not set", () => {
      expect(() => requiredNumberEnv("NONEXISTENT_KEY")).toThrow(
        "Required environment variable NONEXISTENT_KEY is not set",
      );
    });
  });
});
