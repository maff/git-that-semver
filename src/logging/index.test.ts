import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { LogLevel, logger } from "./index";

describe("logger", () => {
  const originalError = console.error;
  let errorSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    errorSpy = mock();
    console.error = errorSpy;
    logger.setLevel(LogLevel.TRACE);
  });

  afterEach(() => {
    console.error = originalError;
    logger.setLevel(LogLevel.INFO);
  });

  describe("log level filtering", () => {
    it("should log messages at or above the configured level", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn("warning");
      logger.error("error");
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });

    it("should suppress messages below the configured level", () => {
      logger.setLevel(LogLevel.WARN);
      logger.trace("trace");
      logger.debug("debug");
      logger.info("info");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("should suppress all messages at SILENT level", () => {
      logger.setLevel(LogLevel.SILENT);
      logger.trace("trace");
      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("should log all messages at TRACE level", () => {
      logger.setLevel(LogLevel.TRACE);
      logger.trace("trace");
      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");
      expect(errorSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe("log methods", () => {
    it("should include the level name in the output", () => {
      logger.info("test message");
      const output = errorSpy.mock.calls[0][0];
      expect(output).toContain("[INFO]");
    });

    it("should include the message in the output", () => {
      logger.info("hello world");
      const output = errorSpy.mock.calls[0][0];
      expect(output).toContain("hello world");
    });

    it("should format object arguments", () => {
      logger.info("data", { key: "value" });
      expect(errorSpy.mock.calls[0].length).toBe(2);
    });
  });

  describe("child logger", () => {
    it("should prefix messages with the child name", () => {
      const child = logger.childLogger("test-component");
      child.info("child message");
      const output = errorSpy.mock.calls[0][0];
      expect(output).toContain("(test-component)");
      expect(output).toContain("child message");
    });

    it("should respect the parent log level", () => {
      logger.setLevel(LogLevel.ERROR);
      const child = logger.childLogger("test-component");
      child.info("should not appear");
      child.error("should appear");
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
