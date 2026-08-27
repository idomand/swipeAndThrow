import { describe, expect, it } from "vitest";
import { formatPhotoDate } from "@/helpers/formatPhotoDate";

// A fixed timestamp so the test doesn't depend on the current date.
// 2023-06-15T12:00:00Z.
const TIMESTAMP = Date.UTC(2023, 5, 15, 12, 0, 0);

describe("formatPhotoDate", () => {
  it("formats a timestamp for English, containing the year", () => {
    const result = formatPhotoDate(TIMESTAMP, "en");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("2023");
  });

  it("formats a timestamp for German, containing the year", () => {
    const result = formatPhotoDate(TIMESTAMP, "de");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("2023");
  });

  it("returns the fallback when the creation time is null", () => {
    expect(formatPhotoDate(null, "en", "Unknown date")).toBe("Unknown date");
  });

  it("defaults the fallback to an empty string", () => {
    expect(formatPhotoDate(null, "en")).toBe("");
  });
});
