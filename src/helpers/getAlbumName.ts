// Derives a photo's display album name from its file:// uri: the last segment
// of the containing folder path (e.g. ".../DCIM/Camera/IMG.jpg" → "Camera").
// The library has no album id on an asset, so the folder path is the source of
// truth — matching how the app groups keeps by folder.

import { getFolderName } from "./getFolderName";

export function getAlbumName(uri: string) {
  return getFolderName(uri).split("/").pop() ?? "";
}
