import { describe, expect, it } from "vitest";
import { getAlbumName } from "@/helpers/getAlbumName";

describe("getAlbumName", () => {
  it("returns the Camera folder name", () => {
    expect(
      getAlbumName("file:///storage/emulated/0/DCIM/Camera/IMG_1.jpg"),
    ).toBe("Camera");
  });

  it("returns the Screenshots folder name", () => {
    expect(
      getAlbumName(
        "file:///storage/emulated/0/Pictures/Screenshots/Screenshot_1.png",
      ),
    ).toBe("Screenshots");
  });

  it("returns the folder name for a WhatsApp Images path", () => {
    expect(
      getAlbumName(
        "file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/IMG.jpg",
      ),
    ).toBe("WhatsApp Images");
  });

  it("returns an empty string for an empty uri", () => {
    expect(getAlbumName("")).toBe("");
  });
});
