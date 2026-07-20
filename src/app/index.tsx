import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import ThemedContainer from "@/components/themedContainer";
import { Spacing } from "@/constants/theme";
import {
  APP_OWNED_MEDIA,
  KEEP_ALBUM_TITLE,
  PHOTO_BATCH_SIZE,
} from "@/constants/values";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "expo-image";
import {
  Album,
  Asset,
  AssetField,
  MediaType,
  Query,
  usePermissions,
} from "expo-media-library";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

type Decision = { action: "keep" | "throw"; asset: Asset };

// A set of photos that share a source folder, applied as one native call so a
// folder that rejects the operation can't take the others down with it.
type KeepGroup = { folder: string; assets: Asset[]; appOwned: boolean };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// Strips the filename off a file:// uri, leaving the containing folder.
function folderOf(uri: string) {
  return decodeURI(uri)
    .replace(/^file:\/\//, "")
    .replace(/\/[^/]*$/, "");
}

// A random position in [0, length), avoiding `exclude` so tapping "pick"
// always lands on a different photo when there's more than one to choose from.
function randomIndex(length: number, exclude: number) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === exclude) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = usePermissions();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [index, setIndex] = useState(0);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // True while the buffered decisions are being applied to the gallery. The
  // photo is hidden and every button is locked so a slow move/delete can't be
  // fired twice.
  const [applying, setApplying] = useState(false);
  // Every decision the user has made, in order. Nothing has touched the
  // gallery yet — photos stay in their original folders until the user applies
  // the batch, so any decision can be undone up to that point. Keeping the
  // decisions in one ordered list is what lets a single Undo reverse the last
  // one whichever kind it was.
  const [decisions, setDecisions] = useState<Decision[]>([]);
  // Photos skipped this session. They keep their place in the gallery — the
  // ids only stop them coming back around before the app is restarted.
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  const pendingKeep = decisions
    .filter((decision) => decision.action === "keep")
    .map((decision) => decision.asset);
  const pendingDelete = decisions
    .filter((decision) => decision.action === "throw")
    .map((decision) => decision.asset);

  const hasPhoto = currentUri !== null;
  const showPhoto = hasPhoto && !applying;

  // Makes sure we're allowed to read the gallery, asking the user if needed.
  async function checkPermission() {
    let response = permission;
    if (!response?.granted) {
      response = await requestPermission();
    }
    if (!response.granted) {
      Alert.alert(
        "Permission needed",
        "SwipeAndThrow needs access to your photos to help you clean them up.",
      );
      return false;
    }
    return true;
  }

  // Ids of the photos already sorted into the keep album, so they never come
  // back around for a second review.
  async function loadReviewedIds() {
    const keepAlbum = await Album.get(KEEP_ALBUM_TITLE);
    if (!keepAlbum) return new Set<string>();

    const reviewed = await new Query()
      .album(keepAlbum)
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .exeForMetadata();

    return new Set(reviewed.map((asset) => asset.id));
  }

  // Fetches a fresh batch of unreviewed photos from the gallery. Photos already
  // in the keep album, or awaiting a decision in the pending buffer, are
  // excluded so nothing comes up for review twice.
  async function loadPhotoBatch() {
    const [batch, reviewedIds] = await Promise.all([
      new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(PHOTO_BATCH_SIZE)
        .exe(),
      loadReviewedIds(),
    ]);

    const decidedIds = new Set(decisions.map((decision) => decision.asset.id));
    const skipped = new Set(skippedIds);
    return batch.filter(
      (asset) =>
        !reviewedIds.has(asset.id) &&
        !decidedIds.has(asset.id) &&
        !skipped.has(asset.id),
    );
  }

  function clearPhoto() {
    setAssets([]);
    setIndex(0);
    setCurrentUri(null);
  }

  // Shows a random photo from `queue`, refilling from the gallery first when
  // the queue has run dry. Assets whose uri can't be resolved (moved or deleted
  // behind our back) are dropped and another one is picked in their place.
  async function pickRandomPicture(queue: Asset[] = assets) {
    let next = queue;

    if (next.length === 0) {
      try {
        setLoading(true);
        next = await loadPhotoBatch();
      } catch {
        Alert.alert("Something went wrong", "Couldn't load your photos.");
        return;
      } finally {
        setLoading(false);
      }

      if (next.length === 0) {
        clearPhoto();
        Alert.alert("All caught up", "No photos left to review.");
        return;
      }
    }

    // Only avoid the current index when we're re-picking from the same queue.
    const nextIndex = randomIndex(next.length, next === assets ? index : -1);
    setAssets(next);
    setIndex(nextIndex);

    try {
      const info = await next[nextIndex].getInfo();
      setCurrentUri(info.uri);
    } catch {
      setCurrentUri(null);
      const remaining = next.filter((_, i) => i !== nextIndex);
      if (remaining.length === 0) {
        clearPhoto();
        Alert.alert("All caught up", "No photos left to review.");
        return;
      }
      await pickRandomPicture(remaining);
    }
  }

  // Debug helper: dumps the gallery's photo albums to the console. Albums with
  // no images (music, video-only, …) are filtered out — this app is photos only.
  async function logAlbums() {
    try {
      const albums = await Album.getAll();
      const entries = await Promise.all(
        albums.map(async (album) => {
          const photos = await new Query()
            .album(album)
            .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
            .exe();

          return {
            title: await album.getTitle(),
            photoCount: photos.length,
            // Where the album actually sits on disk, read off its first photo
            // (`getUri` returns a real file:// path). This is what decides
            // whether an album shows up next to the others in the gallery.
            folder: photos[0] ? folderOf(await photos[0].getUri()) : "—",
          };
        }),
      );

      const photoAlbums = entries.filter((entry) => entry.photoCount > 0);
      console.log(`Photo albums (${photoAlbums.length}):`, photoAlbums);
    } catch (error) {
      console.log("Couldn't read albums", error);
    }
  }

  // Loads the first batch as soon as the app opens, so there's a photo waiting
  // instead of an empty screen. Runs once — the permission prompt is part of it.
  useEffect(() => {
    let active = true;

    (async () => {
      if (!(await checkPermission()) || !active) return;
      await logAlbums();
      if (active) await pickRandomPicture([]);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Moves past the current photo without deciding anything. The photo is left
  // exactly where it is; it just won't come up again this session.
  function handleSkip() {
    const asset = assets[index];
    if (!asset || applying) return;

    setSkippedIds((prev) => [...prev, asset.id]);
    setCurrentUri(null);
    pickRandomPicture(assets.filter((_, i) => i !== index));
  }

  // Used when the queue has run out entirely and the user asks for more.
  async function handlePickPicture() {
    if (await checkPermission()) {
      await pickRandomPicture();
    }
  }

  // Splits the kept photos by source folder. Each group becomes its own native
  // call, so a folder that refuses the operation only fails its own photos.
  async function groupKeepsByFolder(assetsToKeep: Asset[]) {
    const groups = new Map<string, KeepGroup>();

    for (const asset of assetsToKeep) {
      const folder = folderOf(await asset.getUri());
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
    }

    return [...groups.values()];
  }

  // Applies one folder's worth of keeps. Returns a warning when the photos
  // landed in the album but something non-fatal was left behind.
  async function applyKeepGroup(group: KeepGroup) {
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
        return `${group.assets.length} photo(s) from ${group.folder} were copied to the album, but their originals couldn't be removed — you may see duplicates.`;
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

  // Records a decision and moves on. Nothing touches the gallery here — both
  // kinds of decision only join the pending buffer, so every one of them stays
  // undoable until the batch is applied.
  function handleDecision(action: "keep" | "throw") {
    const asset = assets[index];
    if (!asset || applying) return;

    setDecisions((prev) => [...prev, { action, asset }]);
    setCurrentUri(null);
    pickRandomPicture(assets.filter((_, i) => i !== index));
  }

  function handleKeep() {
    handleDecision("keep");
  }

  function handleThrow() {
    handleDecision("throw");
  }

  // Reverses the most recent decision, whichever kind it was, and puts that
  // photo back into the review queue.
  function handleUndo() {
    const last = decisions[decisions.length - 1];
    if (!last || applying) return;

    setDecisions((prev) => prev.slice(0, -1));
    pickRandomPicture([...assets, last.asset]);
  }

  // Applies the whole buffer: moves the kept photos first, then deletes the
  // thrown ones. Each phase is a single batched native call behind one system
  // dialog, and the two run independently — a refused move must not cost the
  // user their deletes, or the other way round. A phase that fails leaves its
  // own photos buffered so they can be retried or undone.
  async function handleApplyDecisions() {
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
              `Keeping ${group.assets.length} from ${group.folder}: ${errorMessage(error)}`,
            );
          }
        }

        if (kept > 0) await verifyKeepAlbum();
      } catch (error) {
        console.log("keep phase failed", error);
        failures.push(`Keeping photos: ${errorMessage(error)}`);
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
          `Throwing ${pendingDelete.length}: ${errorMessage(error)}`,
        );
      }
    }

    // Clear only what actually went through.
    setDecisions((prev) =>
      prev.filter((decision) => !applied.has(decision.asset.id)),
    );
    setApplying(false);

    // Nothing is shown on success — the system dialogs already confirmed it.
    // Only problems are worth interrupting for.
    const notes = [...failures, ...warnings];
    if (notes.length > 0) {
      Alert.alert(
        failures.length > 0
          ? "Some photos weren't handled"
          : "Done, with notes",
        `${notes.join("\n\n")}${failures.length > 0 ? "\n\nThose photos are untouched and still pending." : ""}`,
      );
      return;
    }

    console.log(`Applied: kept ${kept}, deleted ${pendingDelete.length}.`);
  }

  return (
    <ThemedContainer>
      <ThemedView style={styles.actions}>
        {showPhoto && (
          <ThemedView type="backgroundElement" style={styles.photoCard}>
            <Image
              source={{ uri: currentUri }}
              style={styles.photo}
              contentFit="contain"
            />
            <ThemedText type="small" themeColor="textSecondary">
              {assets.length} left
            </ThemedText>
          </ThemedView>
        )}

        <Pressable
          onPress={showPhoto ? handleSkip : handlePickPicture}
          disabled={loading || applying}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <ThemedView type="backgroundSelected" style={styles.mainButton}>
            <ThemedText type="subtitle">
              {loading
                ? "Loading…"
                : applying
                  ? "Working…"
                  : showPhoto
                    ? "Skip"
                    : "Pick a picture"}
            </ThemedText>
          </ThemedView>
        </Pressable>

        <ThemedView style={styles.decisionRow}>
          <Pressable
            onPress={handleKeep}
            disabled={!showPhoto}
            style={({ pressed }) => [
              styles.decisionPressable,
              (pressed || !showPhoto) && styles.pressed,
            ]}
          >
            <ThemedView type="backgroundElement" style={styles.decisionButton}>
              <SymbolView
                tintColor="#34c759"
                name={{ ios: "checkmark", android: "check", web: "check" }}
                size={18}
              />
              <ThemedText type="smallBold">Keep</ThemedText>
              {pendingKeep.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{pendingKeep.length}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>

          <Pressable
            onPress={handleThrow}
            disabled={!showPhoto}
            style={({ pressed }) => [
              styles.decisionPressable,
              (pressed || !showPhoto) && styles.pressed,
            ]}
          >
            <ThemedView type="backgroundElement" style={styles.decisionButton}>
              <SymbolView
                tintColor="#ff3b30"
                name={{ ios: "trash", android: "delete", web: "delete" }}
                size={18}
              />
              <ThemedText type="smallBold">Throw</ThemedText>
              {pendingDelete.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{pendingDelete.length}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>
        </ThemedView>

        {decisions.length > 0 && (
          <ThemedView style={styles.pendingRow}>
            <Pressable
              onPress={handleUndo}
              disabled={applying}
              style={({ pressed }) => [
                styles.decisionPressable,
                (pressed || applying) && styles.pressed,
              ]}
            >
              <ThemedView
                type="backgroundElement"
                style={styles.decisionButton}
              >
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "arrow.uturn.backward",
                    android: "undo",
                    web: "undo",
                  }}
                  size={18}
                />
                <ThemedText type="smallBold">Undo</ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable
              onPress={handleApplyDecisions}
              disabled={applying}
              style={({ pressed }) => [
                styles.decisionPressable,
                (pressed || applying) && styles.pressed,
              ]}
            >
              <ThemedView
                type="backgroundSelected"
                style={styles.decisionButton}
              >
                <ThemedText type="smallBold">
                  {applying ? "Applying…" : `Apply ${decisions.length}`}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: Spacing.two,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  actions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.four,
  },
  mainButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: "center",
  },
  photoCard: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  photo: {
    flex: 1,
    width: "100%",
    borderRadius: Spacing.three,
  },
  decisionRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
  pendingRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
  decisionPressable: {
    flex: 1,
  },
  decisionButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
