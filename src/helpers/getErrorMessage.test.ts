import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the message of an Error subclass", () => {
    expect(getErrorMessage(new TypeError("bad type"))).toBe("bad type");
  });

  it("stringifies a plain string", () => {
    expect(getErrorMessage("just a string")).toBe("just a string");
  });

  it("stringifies non-Error, non-string values", () => {
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(null)).toBe("null");
    expect(getErrorMessage(undefined)).toBe("undefined");
  });
});
