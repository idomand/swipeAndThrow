import { describe, expect, it } from "vitest";
import { translate, translatePlural } from "@/i18n/translations";

// `translations.ts` only imports the `Language` type from userContext (erased at
// runtime), so it's safe to test under the plain node environment — nothing
// native is pulled in.

describe("translate", () => {
  it("returns the string for the requested language", () => {
    expect(translate("en", "home.keep")).toBe("Keep");
    expect(translate("de", "home.keep")).toBe("Behalten");
  });

  it("fills {{name}} placeholders from params", () => {
    expect(translate("en", "home.apply", { n: 3 })).toBe("Apply 3");
    expect(translate("de", "home.remaining", { n: 7 })).toBe("Noch 7");
  });

  it("leaves a placeholder untouched when no matching param is given", () => {
    expect(translate("en", "home.apply")).toBe("Apply {{n}}");
  });

  it("interpolates multiple placeholders", () => {
    expect(
      translate("en", "apply.keepFail", {
        n: 2,
        folder: "DCIM",
        error: "nope",
      }),
    ).toBe("Keeping 2 from DCIM: nope");
  });
});

describe("translatePlural", () => {
  it("uses the _one variant when count is exactly 1", () => {
    expect(translatePlural("en", "albums.photoCount", 1)).toBe("1 photo");
  });

  it("uses the _other variant for any other count", () => {
    expect(translatePlural("en", "albums.photoCount", 0)).toBe("0 photos");
    expect(translatePlural("en", "albums.photoCount", 5)).toBe("5 photos");
  });

  it("passes count through and merges extra params", () => {
    expect(
      translatePlural("en", "apply.copyWarning", 1, { folder: "WhatsApp" }),
    ).toBe(
      "1 photo from WhatsApp was copied to the album, but its original couldn't be removed — you may see duplicates.",
    );
  });

  it("resolves the plural in German too", () => {
    expect(translatePlural("de", "albums.photoCount", 1)).toBe("1 Foto");
    expect(translatePlural("de", "albums.photoCount", 3)).toBe("3 Fotos");
  });
});
