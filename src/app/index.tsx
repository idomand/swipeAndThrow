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
import { useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const PHOTO_BATCH_SIZE = 50;

// Gallery album kept photos are moved into. Doubles as the "already reviewed"
// marker: assets living here are filtered out of new batches.
const KEEP_ALBUM_TITLE = "SwipeAndThrow";

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
  // True while a keep/throw is being applied to the gallery. The photo is
  // hidden and both decision buttons are locked so a slow move/delete can't be
  // double-fired onto the same asset.
  const [deciding, setDeciding] = useState(false);
  // Photos the user threw. Nothing has been deleted yet — they sit here until
  // the user empties the trash, which deletes the whole buffer behind a single
  // system confirmation. Until then every throw is undoable.
  const [pendingDelete, setPendingDelete] = useState<Asset[]>([]);

  const hasPhoto = currentUri !== null;
  const showPhoto = hasPhoto && !deciding;

  function handleSettings() {
    // TODO: navigate to the settings screen
  }

  // Makes sure we're allowed to read the gallery, asking the user if needed.
  async function ensurePermission() {
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
  // kept, or sitting in the trash buffer awaiting deletion, are excluded.
  async function loadPhotoBatch() {
    const [batch, reviewedIds] = await Promise.all([
      new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(PHOTO_BATCH_SIZE)
        .exe(),
      loadReviewedIds(),
    ]);

    const trashedIds = new Set(pendingDelete.map((asset) => asset.id));
    return batch.filter(
      (asset) => !reviewedIds.has(asset.id) && !trashedIds.has(asset.id),
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
        albums.map(async (album) => ({
          id: album.id,
          title: await album.getTitle(),
          photoCount: (
            await new Query()
              .album(album)
              .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
              .exeForMetadata()
          ).length,
        })),
      );

      const photoAlbums = entries.filter((entry) => entry.photoCount > 0);
      console.log(`Photo albums (${photoAlbums.length}):`, photoAlbums);
    } catch (error) {
      console.log("Couldn't read albums", error);
    }
  }

  async function handlePickPicture() {
    if (await ensurePermission()) {
      await logAlbums();
      await pickRandomPicture();
    }
  }

  // Moves the asset into the keep album, creating the album on first use. On
  // Android an asset belongs to exactly one album, so this takes the photo out
  // of its original folder rather than copying it.
  async function moveToKeepAlbum(asset: Asset) {
    const keepAlbum = await Album.get(KEEP_ALBUM_TITLE);
    if (keepAlbum) {
      await keepAlbum.add(asset);
      return;
    }
    await Album.create(KEEP_ALBUM_TITLE, [asset]);
  }

  // Applies a decision to the photo on screen, then drops it from the queue and
  // moves on to another random photo. Keeping moves the photo out of its
  // original folder right away; throwing only buffers it for a later batch
  // delete, so nothing is destroyed here.
  async function handleDecision(action: "keep" | "throw") {
    const asset = assets[index];
    if (!asset || deciding) return;

    // Hides the photo for the whole operation, so an asset that is being moved
    // is never left on screen.
    setDeciding(true);
    try {
      if (action === "keep") {
        await moveToKeepAlbum(asset);
      } else {
        setPendingDelete((prev) => [...prev, asset]);
      }

      setCurrentUri(null);
      await pickRandomPicture(assets.filter((_, i) => i !== index));
    } catch {
      Alert.alert(
        "Couldn't keep that photo",
        "The photo was left where it is. Please try again.",
      );
    } finally {
      setDeciding(false);
    }
  }

  function handleKeep() {
    handleDecision("keep");
  }

  function handleThrow() {
    handleDecision("throw");
  }

  // Puts the most recently thrown photo back into the review queue.
  function handleUndoThrow() {
    if (pendingDelete.length === 0 || deciding) return;

    const restored = pendingDelete[pendingDelete.length - 1];
    setPendingDelete((prev) => prev.slice(0, -1));
    pickRandomPicture([...assets, restored]);
  }

  // Deletes the whole trash buffer in one go. `Asset.delete` takes the entire
  // list, so Android raises a single confirmation for every photo at once —
  // declining it rejects and leaves the buffer untouched.
  async function handleEmptyTrash() {
    if (pendingDelete.length === 0 || deciding) return;

    setDeciding(true);
    try {
      await Asset.delete(pendingDelete);
      setPendingDelete([]);
    } catch {
      Alert.alert(
        "Nothing was deleted",
        "Your photos are still in the trash. You can try again or undo them.",
      );
    } finally {
      setDeciding(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.topBar}>
          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.settingsButton}>
              <SymbolView
                tintColor={theme.text}
                name={{
                  ios: "gearshape",
                  android: "settings",
                  web: "settings",
                }}
                size={14}
              />
              <ThemedText type="small">Settings</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

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
            onPress={handlePickPicture}
            disabled={loading || deciding}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundSelected" style={styles.mainButton}>
              <ThemedText type="subtitle">
                {loading
                  ? "Loading…"
                  : deciding
                    ? "Working…"
                    : hasPhoto
                      ? "Pick another picture"
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
              <ThemedView
                type="backgroundElement"
                style={styles.decisionButton}
              >
                <SymbolView
                  tintColor="#34c759"
                  name={{ ios: "checkmark", android: "check", web: "check" }}
                  size={18}
                />
                <ThemedText type="smallBold">Keep</ThemedText>
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
              <ThemedView
                type="backgroundElement"
                style={styles.decisionButton}
              >
                <SymbolView
                  tintColor="#ff3b30"
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  size={18}
                />
                <ThemedText type="smallBold">Throw</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          {pendingDelete.length > 0 && (
            <ThemedView style={styles.trashRow}>
              <Pressable
                onPress={handleUndoThrow}
                disabled={deciding}
                style={({ pressed }) => [
                  styles.decisionPressable,
                  (pressed || deciding) && styles.pressed,
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
                onPress={handleEmptyTrash}
                disabled={deciding}
                style={({ pressed }) => [
                  styles.decisionPressable,
                  (pressed || deciding) && styles.pressed,
                ]}
              >
                <ThemedView
                  type="backgroundSelected"
                  style={styles.decisionButton}
                >
                  <SymbolView
                    tintColor="#ff3b30"
                    name={{ ios: "trash", android: "delete", web: "delete" }}
                    size={18}
                  />
                  <ThemedText type="smallBold">
                    Delete {pendingDelete.length}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
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
  trashRow: {
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
