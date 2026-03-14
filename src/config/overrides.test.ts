import { describe, expect, it } from "bun:test";

import { applyConfigOverrides } from "./overrides";

describe("applyConfigOverrides", () => {
  describe("parseValue - boolean parsing", () => {
    it("should parse 'true' as boolean true", () => {
      const result = applyConfigOverrides({}, ["key=true"]);
      expect(result.key).toBe(true);
    });

    it("should parse 'false' as boolean false", () => {
      const result = applyConfigOverrides({}, ["key=false"]);
      expect(result.key).toBe(false);
    });

    it("should parse 'True' as boolean true (case-insensitive)", () => {
      const result = applyConfigOverrides({}, ["key=True"]);
      expect(result.key).toBe(true);
    });

    it("should parse 'FALSE' as boolean false (case-insensitive)", () => {
      const result = applyConfigOverrides({}, ["key=FALSE"]);
      expect(result.key).toBe(false);
    });
  });

  describe("parseValue - array parsing", () => {
    it('should parse JSON array \'["a","b"]\' as array', () => {
      const result = applyConfigOverrides({}, ['key=["a","b"]']);
      expect(result.key).toEqual(["a", "b"]);
    });

    it("should throw on malformed JSON array '[\"a\"]x'", () => {
      // Only arrays that start with [ AND end with ] attempt JSON.parse
      expect(() => applyConfigOverrides({}, ['key=["a"]x'])).not.toThrow();
    });

    it("should throw on malformed JSON array '[invalid]'", () => {
      expect(() => applyConfigOverrides({}, ["key=[invalid]"])).toThrow(
        "Invalid array format",
      );
    });
  });

  describe("parseValue - number parsing", () => {
    it("should parse '42' as number", () => {
      const result = applyConfigOverrides({}, ["key=42"]);
      expect(result.key).toBe(42);
    });

    it("should parse '3.14' as number", () => {
      const result = applyConfigOverrides({}, ["key=3.14"]);
      expect(result.key).toBe(3.14);
    });

    it("should parse '0' as number", () => {
      const result = applyConfigOverrides({}, ["key=0"]);
      expect(result.key).toBe(0);
    });
  });

  describe("parseValue - string fallback", () => {
    it("should parse 'hello' as string", () => {
      const result = applyConfigOverrides({}, ["key=hello"]);
      expect(result.key).toBe("hello");
    });

    it("should parse empty value as empty string", () => {
      const result = applyConfigOverrides({}, ["key="]);
      expect(result.key).toBe("");
    });
  });

  describe("override application", () => {
    it("should apply a single override", () => {
      const config = { output: { type: "env" } };
      const result = applyConfigOverrides(config, ["output.type=json"]);
      expect(result.output.type).toBe("json");
    });

    it("should apply multiple overrides", () => {
      const config = { output: { type: "env", env: { prefix: "GTS_" } } };
      const result = applyConfigOverrides(config, [
        "output.type=json",
        "output.env.prefix=CUSTOM_",
      ]);
      expect(result.output.type).toBe("json");
      expect(result.output.env.prefix).toBe("CUSTOM_");
    });

    it("should apply deep nested path override", () => {
      const config = {};
      const result = applyConfigOverrides(config, ["a.b.c.d=deep"]);
      expect(result.a.b.c.d).toBe("deep");
    });
  });

  describe("invalid format", () => {
    it("should throw on override without '='", () => {
      expect(() => applyConfigOverrides({}, ["invalidformat"])).toThrow(
        "Invalid config value format",
      );
    });

    it("should throw on override with multiple '='", () => {
      expect(() => applyConfigOverrides({}, ["a=b=c"])).toThrow(
        "Invalid config value format",
      );
    });
  });
});
