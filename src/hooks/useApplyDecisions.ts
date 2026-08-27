import { KEEP_ALBUM_TITLE } from "@/constants/values";
import { getErrorMessage } from "@/helpers/getErrorMessage";
import { useTranslation } from "@/hooks/useTranslation";
import { groupByFolder, type KeepGroup } from "@/lib/groupKeeps";
import {
  Album,
  Asset,
  AssetField,
  MediaType,
  Query,
} from "expo-media-library";
import { useState } from "react";
import { Alert } from "react-native";

type UseApplyDecisionsArgs = {
  decisions: unknown[];
  pendingKeep: Asset[];
  pendingDelete: Asset[];
  // The ids that actually went through. The caller clears them from the buffer
  // and invalidates the deck's scan caches.
  onApplied: (appliedIds: Set<string>) => void;
};

// Owns the apply pipeline: moves the kept photos first, then deletes the thrown
// ones. Each phase is a single batched native call behind one system dialog,
// and the two run independently — a refused move must not cost the user their
// deletes, or the other way round. A phase that fails leaves its own photos
// buffered so they can be retried or undone.
export function useApplyDecisions({
  decisions,
  pendingKeep,
  pendingDelete,
  onApplied,
}: UseApplyDecisionsArgs) {
  const { t, tp } = useTranslation();
  // True while the buffered decisions are being applied to the gallery. Every
  // swipe and button is locked so a slow move/delete can't be fired twice.
  const [applying, setApplying] = useState(false);

  // Splits the kept photos by source folder. Each group becomes its own native
  // call, so a folder that refuses the operation only fails its own photos.
  async function groupKeepsByFolder(assetsToKeep: Asset[]) {
    // Resolve every source uri up front so the native round-trips overlap
    // instead of running one at a time; the grouping itself is synchronous and
    // lives in `@/lib/groupKeeps` so it can be unit tested without the library.
    const uris = await Promise.all(assetsToKeep.map((asset) => asset.getUri()));
    return groupByFolder(assetsToKeep, uris);
  }

  // Applies one folder's worth of keeps. Returns a warning when the photos
  // landed in the album but something non-fatal was left behind.
  async function applyKeepGroup(group: KeepGroup<Asset>) {
    if (group.appOwned) {
      // Ownership can't move out of another app's media directory, so copy
      // into the album (`moveAssets: false`) and delete the originals. The copy
      // needs no permission dialog — the new file belongs to us — but the
      // delete does.
      await Album.create(KEEP_ALBUM_TITLE, group.assets, false);

      try {
        await Asset.delete(group.assets);
      } catch {
        // The photos are safely in the album; only the originals remain.
        // Retrying would copy them a second time, so treat this as done and
        // tell the user what's left over.
        return tp("apply.copyWarning", group.assets.length, {
          folder: group.folder,
        });
      }

      return null;
    }

    const keepAlbum = await Album.get(KEEP_ALBUM_TITLE);
    if (keepAlbum) {
      // The native binding takes `List<Asset>`, and nothing in the JS layer
      // wraps a lone asset despite what the types claim — always pass an array.
      await keepAlbum.add(group.assets);
    } else {
      // `moveAssets` defaults to true natively, but pass it explicitly so the
      // move-vs-copy behavior is visible here.
      await Album.create(KEEP_ALBUM_TITLE, group.assets, true);
    }

    return null;
  }

  // A move can succeed while the album fails to register, which would silently
  // strand photos outside their original folders. Read it back from MediaStore
  // and fail loudly if it isn't there.
  async function verifyKeepAlbum() {
    const saved = await Album.get(KEEP_ALBUM_TITLE);
    if (!saved) {
      throw new Error(
        `Photos were moved, but no "${KEEP_ALBUM_TITLE}" album is registered in MediaStore.`,
      );
    }

    const contents = await new Query()
      .album(saved)
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .exeForMetadata();
    console.log(
      `Keep album "${KEEP_ALBUM_TITLE}" (id ${saved.id}) now holds ${contents.length} photo(s).`,
    );
  }

  // Applies the whole buffer: moves the kept photos first, then deletes the
  // thrown ones. Each phase is a single batched native call behind one system
  // dialog, and the two run independently — a refused move must not cost the
  // user their deletes, or the other way round. A phase that fails leaves its
  // own photos buffered so they can be retried or undone.
  async function apply() {
    if (decisions.length === 0 || applying) return;

    setApplying(true);
    const failures: string[] = [];
    const warnings: string[] = [];
    // Ids that made it through, so a failing group leaves only its own photos
    // buffered for a retry.
    const applied = new Set<string>();
    let kept = 0;

    if (pendingKeep.length > 0) {
      try {
        const groups = await groupKeepsByFolder(pendingKeep);

        for (const group of groups) {
          try {
            const warning = await applyKeepGroup(group);
            if (warning) warnings.push(warning);

            group.assets.forEach((asset) => applied.add(asset.id));
            kept += group.assets.length;
          } catch (error) {
            console.log(`keep failed for ${group.folder}`, error);
            failures.push(
              t("apply.keepFail", {
                n: group.assets.length,
                folder: group.folder,
                error: getErrorMessage(error),
              }),
            );
          }
        }

        if (kept > 0) await verifyKeepAlbum();
      } catch (error) {
        console.log("keep phase failed", error);
        failures.push(
          t("apply.keepPhaseFail", { error: getErrorMessage(error) }),
        );
      }
    }

    if (pendingDelete.length > 0) {
      try {
        // One `createDeleteRequest` for the whole list, so Android asks once.
        await Asset.delete(pendingDelete);
        pendingDelete.forEach((asset) => applied.add(asset.id));
      } catch (error) {
        console.log("throw batch failed", error);
        failures.push(
          t("apply.throwFail", {
            n: pendingDelete.length,
            error: getErrorMessage(error),
          }),
        );
      }
    }

    // Clear only what actually went through, and let the caller drop the deck's
    // undo history and invalidate its scan caches: applied swipes are committed
    // to the gallery now, so a spring-back would no longer map to the buffer,
    // and the caches would re-surface a now-deleted id or an already-kept photo.
    onApplied(applied);
    setApplying(false);

    // Nothing is shown on success — the system dialogs already confirmed it.
    // Only problems are worth interrupting for.
    const notes = [...failures, ...warnings];
    if (notes.length > 0) {
      Alert.alert(
        failures.length > 0
          ? t("apply.someFailedTitle")
          : t("apply.doneWithNotesTitle"),
        `${notes.join("\n\n")}${failures.length > 0 ? `\n\n${t("apply.stillPending")}` : ""}`,
      );
      return;
    }

    console.log(`Applied: kept ${kept}, deleted ${pendingDelete.length}.`);
  }

  return { applying, apply };
}
