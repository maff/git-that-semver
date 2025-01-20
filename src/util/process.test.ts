import { describe, expect, test } from "bun:test";

import { executeCommand } from "./process";

describe("executeCommand", () => {
  test("successfully executes a command and returns stdout", () => {
    const result = executeCommand(["echo", "hello world"]);
    expect(result).toBe("hello world");
  });

  test("handles empty output", () => {
    const result = executeCommand(["echo", ""]);
    expect(result).toBe("");
  });

  test("trims whitespace from output", () => {
    const result = executeCommand(["echo", "  hello  "]);
    expect(result).toBe("hello");
  });
});
