import { describe, expect, test } from "bun:test";

import { processUtils } from "./process";

describe("executeCommand", () => {
  test("successfully executes a command and returns stdout", () => {
    const result = processUtils.executeCommand(["echo", "hello world"]);
    expect(result).toBe("hello world");
  });

  test("handles empty output", () => {
    const result = processUtils.executeCommand(["echo", ""]);
    expect(result).toBe("");
  });

  test("trims whitespace from output", () => {
    const result = processUtils.executeCommand(["echo", "  hello  "]);
    expect(result).toBe("hello");
  });
});
