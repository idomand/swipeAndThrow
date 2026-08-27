import { describe, expect, it } from "vitest";
import { groupByFolder } from "@/lib/groupKeeps";

type TestAsset = { id: string };
const asset = (id: string): TestAsset => ({ id });

const uri = (folder: string, file: string) => `file://${folder}/${file}`;

describe("groupByFolder", () => {
  it("returns no groups for an empty input", () => {
    expect(groupByFolder([], [])).toEqual([]);
  });

  it("groups assets that share a source folder", () => {
    const assets = [asset("a"), asset("b"), asset("c")];
    const uris = [
      uri("/storage/emulated/0/DCIM/Camera", "a.jpg"),
      uri("/storage/emulated/0/DCIM/Camera", "b.jpg"),
      uri("/storage/emulated/0/Pictures", "c.jpg"),
    ];

    const groups = groupByFolder(assets, uris);
    expect(groups).toHaveLength(2);

    const camera = groups.find((g) => g.folder.endsWith("Camera"));
    expect(camera?.assets.map((a) => a.id)).toEqual(["a", "b"]);
    expect(camera?.appOwned).toBe(false);
  });

  it("flags Android/media folders as app-owned", () => {
    const groups = groupByFolder(
      [asset("w")],
      [
        uri(
          "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/Images",
          "w.jpg",
        ),
      ],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].appOwned).toBe(true);
  });

  it("separates app-owned from movable folders in one batch", () => {
    const assets = [asset("cam"), asset("wa"), asset("tg")];
    const uris = [
      uri("/storage/emulated/0/DCIM/Camera", "cam.jpg"),
      uri(
        "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media",
        "wa.jpg",
      ),
      uri(
        "/storage/emulated/0/Android/media/org.telegram.messenger/Telegram",
        "tg.jpg",
      ),
    ];

    const groups = groupByFolder(assets, uris);
    expect(groups).toHaveLength(3);
    expect(groups.filter((g) => g.appOwned).map((g) => g.assets[0].id)).toEqual([
      "wa",
      "tg",
    ]);
    expect(groups.filter((g) => !g.appOwned).map((g) => g.assets[0].id)).toEqual(
      ["cam"],
    );
  });

  it("preserves first-appearance folder order and input order within a group", () => {
    const assets = [asset("1"), asset("2"), asset("3"), asset("4")];
    const uris = [
      uri("/B", "1.jpg"),
      uri("/A", "2.jpg"),
      uri("/B", "3.jpg"),
      uri("/A", "4.jpg"),
    ];
    const groups = groupByFolder(assets, uris);
    expect(groups.map((g) => g.folder)).toEqual(["/B", "/A"]);
    expect(groups[0].assets.map((a) => a.id)).toEqual(["1", "3"]);
    expect(groups[1].assets.map((a) => a.id)).toEqual(["2", "4"]);
  });
});
