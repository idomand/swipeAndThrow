import { describe, expect, it } from "vitest";
import { getFolderName } from "./getFolderName";

describe("getFolderName", () => {
  it("strips the filename and the file:// scheme", () => {
    expect(getFolderName("file:///storage/emulated/0/DCIM/Camera/IMG_1.jpg")).toBe(
      "/storage/emulated/0/DCIM/Camera",
    );
  });

  it("works without a file:// scheme", () => {
    expect(getFolderName("/storage/emulated/0/Pictures/photo.png")).toBe(
      "/storage/emulated/0/Pictures",
    );
  });

  it("decodes percent-encoded characters in the path", () => {
    expect(
      getFolderName("file:///storage/emulated/0/My%20Album/photo.jpg"),
    ).toBe("/storage/emulated/0/My Album");
  });

  it("identifies an Android/media app folder", () => {
    expect(
      getFolderName(
        "file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/IMG.jpg",
      ),
    ).toBe("/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media");
  });
});
