import { APP_OWNED_MEDIA } from "@/constants/values";
import { getFolderName } from "@/helpers/getFolderName";

// A set of kept photos that share a source folder. Applied as one native call
// so a folder that rejects the operation can't take the others down with it.
// `appOwned` marks folders under `Android/media/` (WhatsApp, Telegram, …) whose
// ownership MediaStore won't change — those are copied-then-deleted rather than
// moved. See the hard rules in AGENTS.md.
export type KeepGroup<A> = { folder: string; assets: A[]; appOwned: boolean };

// Buckets assets by their source folder, given each asset's resolved uri
// (index-aligned with `assets`). Pure and native-free: the caller resolves the
// uris up front — a native round-trip — and this does the synchronous grouping,
// so it can be tested without expo-media-library. Group order follows first
// appearance of each folder, and each group keeps its assets in input order.
export function groupByFolder<A>(assets: A[], uris: string[]): KeepGroup<A>[] {
  const groups = new Map<string, KeepGroup<A>>();

  assets.forEach((asset, index) => {
    const folder = getFolderName(uris[index]);
    const group = groups.get(folder);
    if (group) {
      group.assets.push(asset);
    } else {
      groups.set(folder, {
        folder,
        assets: [asset],
        appOwned: APP_OWNED_MEDIA.test(folder),
      });
    }
  });

  return [...groups.values()];
}
