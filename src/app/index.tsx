import ThemedContainer from "@/components/common/themedContainer";
import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import PhotoCard from "@/components/PhotoCard";
import SwipeLabel from "@/components/SwipeLabel";
import { Spacing } from "@/constants/theme";
import { KEEP_ALBUM_TITLE, PHOTO_BATCH_SIZE } from "@/constants/values";
import { useUserContext, type UserSettings } from "@/contexts/userContext";
import { getErrorMessage } from "@/helpers/getErrorMessage";
import { sample } from "@/helpers/sample";
import { useTheme } from "@/hooks/useTheme";
import {
  applyDecision,
  applySkip,
  applyUndo,
  clearApplied,
  emptyBuffer,
  resetHistory,
  selectPendingDelete,
  selectPendingKeep,
  type BufferState,
} from "@/lib/decisionBuffer";
import { groupByFolder, type KeepGroup } from "@/lib/groupKeeps";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Album,
  Asset,
  AssetField,
  MediaType,
  Query,
  usePermissions,
} from "expo-media-library";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { Swiper, type SwiperCardRefType } from "rn-swiper-list";

// A photo in the deck, with its uri resolved up front so the whole card stack
// can render at once — the swiper needs every card ready, not one at a time.
type PhotoCardData = { asset: Asset; uri: string };

// The plain, serializable shape handed to the swiper. `Asset` is a
// native-backed class the swiper's worklets can't copy to the UI thread
// ("Cannot copy value of type Asset"), so the asset itself never goes in —
// the swipe callbacks look it up by deck position through `cardsRef` instead.
type DeckItem = { id: string; uri: string };

// The settings that shape a batch, folded into one comparable string. Only
// these change what the gallery query returns, so the deck is reloaded on
// returning from Settings when this differs from what the current deck was
// built with — the theme, for one, doesn't warrant a reload.
function deckSignature(settings: UserSettings) {
  return settings.selectedAlbumIds.join(",");
}

// Fixed overlay badges the swiper fades in as a card is dragged, one per
// direction. Defined at module scope so their identity is stable.
function KeepLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.keep")} color="#34c759" align="right" />;
}
function ThrowLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.throw")} color="#ff3b30" align="left" />;
}
function SkipLabel() {
  const { t } = useTranslation();
  return <SwipeLabel text={t("home.skip")} color="#8e8e93" align="center" />;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { t, tp } = useTranslation();
  const { settings, setSetting, loaded } = useUserContext();
  const [permission, requestPermission] = usePermissions();

  // Show the About screen once, the first time the app is ever opened. Gated on
  // `loaded` so it never fires against the un-hydrated default settings. The
  // flag is persisted at push time (not on dismiss) so a force-quit still counts
  // as "seen"; the ref guards against a re-render firing a second push before
  // the persisted flag propagates back through the provider.
  const firstRunHandledRef = useRef(false);
  useEffect(() => {
    if (!loaded || settings.hasSeenInfo || firstRunHandledRef.current) return;
    firstRunHandledRef.current = true;
    setSetting("hasSeenInfo", true);
    router.push("/about");
  }, [loaded, settings.hasSeenInfo, setSetting]);

  // The current deck of photos and how far through it the user has swiped.
  // `batchKey` remounts the swiper on every new batch so its internal index
  // resets to the top of the fresh stack.
  const [cards, setCards] = useState<PhotoCardData[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [batchKey, setBatchKey] = useState(0);
  const [loading, setLoading] = useState(false);

  // True while the buffered decisions are being applied to the gallery. Every
  // swipe and button is locked so a slow move/delete can't be fired twice.
  const [applying, setApplying] = useState(false);
  // The whole decision buffer in one place: the ordered decisions, the ids of
  // photos skipped this session, and the current deck's swipe history. Nothing
  // has touched the gallery yet — photos stay in their original folders until
  // the user applies the batch, so any decision stays undoable up to that
  // point, and the single ordered history is what lets one Undo reverse the
  // last swipe whichever kind it was. The transitions live in
  // `@/lib/decisionBuffer` so they can be unit tested; here they drive state.
  const [buffer, setBuffer] = useState<BufferState<Asset>>(emptyBuffer);
  const { decisions, skippedIds, history } = buffer;

  // Imperative handle on the deck so the Keep/Throw/Skip buttons drive the same
  // swipes as the gestures, and Undo can spring the last card back.
  const swiperRef = useRef<SwiperCardRefType>(null);

  // `onSwipedAll` fires from a worklet reaction that captured an earlier
  // render's closures, and the swipe callbacks are memoized. Reading the
  // exclusion sets and current cards through refs keeps the next batch filtered
  // against the latest decisions, and each swipe looking up the live deck.
  const decisionsRef = useRef(decisions);
  const skippedIdsRef = useRef(skippedIds);
  const cardsRef = useRef(cards);
  const loadingRef = useRef(false);
  // The settings the current deck was loaded with. Null until the first load
  // records one, so the focus effect knows there's nothing to compare against
  // yet and leaves the initial load to run.
  const loadedSignatureRef = useRef<string | null>(null);

  // Session caches for the two expensive gallery scans, so a new batch every 20
  // swipes doesn't re-scan the whole library. The candidate pool is the deduped
  // eligible ids tagged with the `deckSignature` it was built for — a signature
  // mismatch (the user changed album selection) invalidates it. `reviewedIds`
  // is the keep album's contents. Both are cleared after a successful apply,
  // when photos are actually deleted/moved and the scans would be stale.
  // Fresh photos taken or deleted *outside* the app mid-session won't show up
  // until then; that matches the app's session model.
  const candidatePoolRef = useRef<{ signature: string; ids: string[] } | null>(
    null,
  );
  const reviewedIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    decisionsRef.current = decisions;
    skippedIdsRef.current = skippedIds;
    cardsRef.current = cards;
  }, [decisions, skippedIds, cards]);

  // What the swiper actually renders: the same order as `cards`, but stripped
  // to serializable fields so nothing native crosses into a worklet.
  const deckData = useMemo<DeckItem[]>(
    () => cards.map((card) => ({ id: card.asset.id, uri: card.uri })),
    [cards],
  );

  const pendingKeep = selectPendingKeep(decisions);
  const pendingDelete = selectPendingDelete(decisions);

  const hasDeck = cards.length > 0;
  const hasCard = hasDeck && activeCardIndex < cards.length;
  const canSwipe = hasCard && !applying && !loading;
  const remaining = cards.length - activeCardIndex;
  const hasDecisions = decisions.length > 0;
  const canUndo = history.length > 0 && !applying && !loading;

  // Makes sure we're allowed to read the gallery, asking the user if needed.
  async function checkPermission() {
    let response = permission;
    if (!response?.granted) {
      response = await requestPermission();
    }
    if (!response.granted) {
      Alert.alert(t("alert.permissionTitle"), t("alert.permissionBody"));
      return false;
    }
    return true;
  }

  // Ids of the photos already sorted into the keep album, so they never come
  // back around for a second review. Cached for the session — the keep album
  // only changes when we apply a batch, which clears the cache.
  async function loadReviewedIds() {
    if (reviewedIdsRef.current) return reviewedIdsRef.current;

    const keepAlbum = await Album.get(KEEP_ALBUM_TITLE);
    if (!keepAlbum) {
      const empty = new Set<string>();
      reviewedIdsRef.current = empty;
      return empty;
    }

    const reviewed = await new Query()
      .album(keepAlbum)
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .exeForMetadata();

    const ids = new Set(reviewed.map((asset) => asset.id));
    reviewedIdsRef.current = ids;
    return ids;
  }

  // The deduped pool of ids a batch may draw from: lightweight metadata (no uri
  // resolution) for every image in the selected albums, or the whole library
  // when none are selected. One query per album — `Query.album` takes a single
  // album, there's no multi-album filter — merged and deduped (an asset can
  // surface in more than one selected album on iOS). Metadata is enough here;
  // only the photos that make the batch get rebuilt into `Asset`s.
  //
  // Cached for the session, keyed by the album selection: a new batch every 20
  // swipes reuses the scan instead of walking the whole library again. The
  // reviewed/decided/skipped exclusions are applied fresh per batch by the
  // caller, so caching the raw candidate ids stays correct.
  async function loadCandidatePool() {
    const signature = deckSignature(settings);
    const cached = candidatePoolRef.current;
    if (cached && cached.signature === signature) return cached.ids;

    const albumIds = settings.selectedAlbumIds;
    const metadata =
      albumIds.length === 0
        ? await new Query()
            .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
            .exeForMetadata()
        : (
            await Promise.all(
              albumIds.map((id) =>
                new Query()
                  .album(new Album(id))
                  .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
                  .exeForMetadata(),
              ),
            )
          ).flat();

    const seen = new Set<string>();
    const ids: string[] = [];
    for (const asset of metadata) {
      if (seen.has(asset.id)) continue;
      seen.add(asset.id);
      ids.push(asset.id);
    }

    candidatePoolRef.current = { signature, ids };
    return ids;
  }

  // Fetches a fresh batch of unreviewed photos from the gallery. Photos already
  // in the keep album, or awaiting a decision in the pending buffer, are
  // excluded so nothing comes up for review twice. Reads the exclusion sets
  // through refs so a call from `onSwipedAll` sees the latest decisions.
  //
  // The random draw happens here, over the whole eligible pool, *before* the
  // batch is sliced off — so a batch is a random sample of the selected albums
  // rather than their newest N photos.
  async function loadPhotoBatch() {
    const [candidateIds, reviewedIds] = await Promise.all([
      loadCandidatePool(),
      loadReviewedIds(),
    ]);

    const decidedIds = new Set(
      decisionsRef.current.map((decision) => decision.asset.id),
    );
    const skipped = new Set(skippedIdsRef.current);

    // Drop anything already handled, so the random pick is over fresh photos.
    // The candidate ids are already deduped by `loadCandidatePool`.
    const pool = candidateIds.filter(
      (id) =>
        !reviewedIds.has(id) && !decidedIds.has(id) && !skipped.has(id),
    );

    return sample(pool, PHOTO_BATCH_SIZE).map((id) => new Asset(id));
  }

  // Loads the next deck: pulls a batch, resolves each photo's uri (dropping any
  // that can't be — moved or deleted behind our back), then remounts the swiper
  // on the fresh stack. Guarded so overlapping loads can't stack up.
  const loadBatch = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    // Record the settings this deck is built with, so a later focus can tell
    // whether anything that shapes the batch changed while in Settings.
    loadedSignatureRef.current = deckSignature(settings);
    setLoading(true);

    try {
      const batch = await loadPhotoBatch();
      const resolved = await Promise.all(
        batch.map(async (asset) => {
          try {
            // Only the uri is needed to display the card; `getUri` resolves
            // just that, without the full `getInfo` (dimensions, filename, …).
            const uri = await asset.getUri();
            return { asset, uri } as PhotoCardData;
          } catch {
            return null;
          }
        }),
      );
      const next = resolved.filter(
        (card): card is PhotoCardData => card !== null,
      );

      setCards(next);
      setActiveCardIndex(0);
      setBuffer((prev) => resetHistory(prev));
      setBatchKey((key) => key + 1);

      if (next.length === 0) {
        Alert.alert(t("alert.allCaughtUpTitle"), t("alert.allCaughtUpBody"));
      }
    } catch {
      Alert.alert(t("alert.loadFailTitle"), t("alert.loadFailBody"));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Loads the first batch as soon as the app opens, so there's a deck waiting
  // instead of an empty screen. Runs once — the permission prompt is part of it.
  useEffect(() => {
    let active = true;

    (async () => {
      if (!(await checkPermission()) || !active) return;
      if (active) await loadBatch();
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reloads the deck on returning from Settings, but only when a setting that
  // shapes the batch actually changed — so a visit that changed nothing (or
  // only the theme) leaves the current deck and its place untouched. The very
  // first focus is skipped: the initial load above owns the first deck, and it
  // hasn't recorded a signature yet.
  useFocusEffect(
    useCallback(() => {
      const signature = deckSignature(settings);
      if (
        loadedSignatureRef.current !== null &&
        loadedSignatureRef.current !== signature
      ) {
        loadBatch();
      }
    }, [settings, loadBatch]),
  );

  // Records a keep/throw decision. Nothing touches the gallery here — both
  // kinds only join the pending buffer, so every one of them stays undoable
  // until the batch is applied.
  const recordDecision = useCallback(
    (action: "keep" | "throw", asset: Asset) => {
      setBuffer((prev) => applyDecision(prev, action, asset));
    },
    [],
  );

  // Records a skip. The photo is left exactly where it is; the id just stops it
  // coming up again this session.
  const recordSkip = useCallback((asset: Asset) => {
    setBuffer((prev) => applySkip(prev, asset));
  }, []);

  // Swipe callbacks. `index` is the card's position in the deck; `cardsRef`
  // keeps the lookup pointed at the live deck without re-subscribing the
  // gesture handlers on every render.
  // The card at `index` is leaving, so the next one becomes active. Advance the
  // render window here too — not just from the swiper's `onIndexChange`, which
  // can lag — so the newly centered card always has its image already decoded.
  const advanceWindow = useCallback((index: number) => {
    setActiveCardIndex((current) => Math.max(current, index + 1));
  }, []);

  const handleSwipeRight = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) recordDecision("keep", card.asset);
      advanceWindow(index);
    },
    [recordDecision, advanceWindow],
  );
  const handleSwipeLeft = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) recordDecision("throw", card.asset);
      advanceWindow(index);
    },
    [recordDecision, advanceWindow],
  );
  const handleSwipeTop = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) recordSkip(card.asset);
      advanceWindow(index);
    },
    [recordSkip, advanceWindow],
  );
  const handleIndexChange = useCallback((index: number) => {
    setActiveCardIndex(index);
  }, []);

  // Renders a card's contents. The swiper mounts every card in the batch up
  // front, so decoding all ~50 full-size images at once would blow memory and
  // leave later cards blank. Only cards near the top of the stack get their
  // image; the window reaches a few ahead so the next photo is already decoded
  // when it surfaces.
  const renderCard = useCallback(
    (item: DeckItem, index: number) => {
      const near = index >= activeCardIndex - 1 && index <= activeCardIndex + 3;
      return <PhotoCard uri={near ? item.uri : null} />;
    },
    [activeCardIndex],
  );

  // Buttons drive the deck through its ref so a tap makes exactly the same
  // swipe a gesture would — a single code path records every decision.
  function handleKeep() {
    if (!canSwipe) return;
    swiperRef.current?.swipeRight();
  }
  function handleThrow() {
    if (!canSwipe) return;
    swiperRef.current?.swipeLeft();
  }
  function handleSkip() {
    if (!canSwipe) return;
    swiperRef.current?.swipeTop();
  }

  // Reverses the most recent swipe, whichever kind it was, and springs that
  // card back to the top of the deck. Limited to the deck on screen — the
  // swiper can't restore a card from a batch it has already replaced.
  function handleUndo() {
    if (!canUndo) return;
    setBuffer((prev) => applyUndo(prev));
    swiperRef.current?.swipeBack();
  }

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
        failures.push(t("apply.keepPhaseFail", { error: getErrorMessage(error) }));
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

    // Clear only what actually went through, and drop the deck's undo history:
    // applied swipes are committed to the gallery now, so a spring-back would no
    // longer map to the buffer. Decisions that failed stay buffered for a retry.
    setBuffer((prev) => clearApplied(prev, applied));
    // The gallery just changed under the caches: thrown photos are deleted and
    // kept ones moved into the keep album. Drop both so the next batch re-scans
    // and doesn't re-surface a now-deleted id or an already-kept photo.
    if (applied.size > 0) {
      candidatePoolRef.current = null;
      reviewedIdsRef.current = null;
    }
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

  return (
    <ThemedContainer>
      <ThemedView style={styles.header}>
        <Pressable
          onPress={() => router.push("/settings")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <ThemedView type="backgroundElement" style={styles.cogButton}>
            <SymbolView
              tintColor={theme.text}
              name={{ ios: "gearshape", android: "settings", web: "settings" }}
              size={22}
            />
          </ThemedView>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.actions}>
        <ThemedView style={styles.deck}>
          {hasDeck ? (
            <Swiper
              key={batchKey}
              ref={swiperRef}
              data={deckData}
              keyExtractor={(item) => item.id}
              renderCard={renderCard}
              prerenderItems={3}
              cardStyle={styles.card}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSwipeTop={handleSwipeTop}
              onIndexChange={handleIndexChange}
              onSwipedAll={loadBatch}
              disableBottomSwipe
              disableRightSwipe={applying}
              disableLeftSwipe={applying}
              disableTopSwipe={applying}
              OverlayLabelRight={KeepLabel}
              OverlayLabelLeft={ThrowLabel}
              OverlayLabelTop={SkipLabel}
            />
          ) : (
            <ThemedView type="backgroundElement" style={styles.placeholder}>
              <ThemedText type="small" themeColor="textSecondary">
                {loading ? t("home.loading") : t("home.noPhotos")}
              </ThemedText>
              {!loading && (
                <Pressable
                  onPress={loadBatch}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <ThemedView
                    type="backgroundSelected"
                    style={styles.skipButton}
                  >
                    <ThemedText type="small">{t("home.checkAgain")}</ThemedText>
                  </ThemedView>
                </Pressable>
              )}
            </ThemedView>
          )}
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary">
          {hasCard ? t("home.remaining", { n: remaining }) : ""}
        </ThemedText>

        <ThemedView style={styles.decisionRow}>
          <Pressable
            onPress={handleThrow}
            disabled={!canSwipe}
            style={({ pressed }) => [
              styles.decisionPressable,
              (pressed || !canSwipe) && styles.pressed,
            ]}
          >
            <ThemedView type="backgroundElement" style={styles.decisionButton}>
              <SymbolView
                tintColor="#ff3b30"
                name={{ ios: "trash", android: "delete", web: "delete" }}
                size={18}
              />
              <ThemedText type="smallBold">{t("home.throw")}</ThemedText>
              {pendingDelete.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{pendingDelete.length}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>

          <Pressable
            onPress={handleKeep}
            disabled={!canSwipe}
            style={({ pressed }) => [
              styles.decisionPressable,
              (pressed || !canSwipe) && styles.pressed,
            ]}
          >
            <ThemedView type="backgroundElement" style={styles.decisionButton}>
              <SymbolView
                tintColor="#34c759"
                name={{ ios: "checkmark", android: "check", web: "check" }}
                size={18}
              />
              <ThemedText type="smallBold">{t("home.keep")}</ThemedText>
              {pendingKeep.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{pendingKeep.length}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.skipRow}>
          <Pressable
            onPress={handleSkip}
            disabled={!canSwipe}
            style={({ pressed }) => (pressed || !canSwipe) && styles.pressed}
          >
            <ThemedView
              type="backgroundSelected"
              style={[styles.decisionButton, styles.skipButtonInline]}
            >
              <SymbolView
                tintColor={theme.text}
                name={{
                  ios: "arrow.up",
                  android: "arrow_upward",
                  web: "arrow_upward",
                }}
                size={18}
              />
              <ThemedText type="smallBold">{t("home.skip")}</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.pendingRow}>
          <Pressable
            onPress={handleUndo}
            disabled={!canUndo}
            style={({ pressed }) => [
              styles.decisionPressable,
              pressed && styles.pressed,
              !canUndo && styles.disabled,
            ]}
          >
            <ThemedView type="backgroundElement" style={styles.decisionButton}>
              <SymbolView
                tintColor={theme.text}
                name={{
                  ios: "arrow.uturn.backward",
                  android: "undo",
                  web: "undo",
                }}
                size={18}
              />
              <ThemedText type="smallBold">{t("home.undo")}</ThemedText>
            </ThemedView>
          </Pressable>

          <Pressable
            onPress={handleApplyDecisions}
            disabled={!hasDecisions || applying}
            style={({ pressed }) => [
              styles.decisionPressable,
              pressed && styles.pressed,
              (!hasDecisions || applying) && styles.disabled,
            ]}
          >
            <ThemedView type="backgroundSelected" style={styles.decisionButton}>
              <ThemedText type="smallBold">
                {applying
                  ? t("home.applying")
                  : t("home.apply", { n: decisions.length })}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignSelf: "stretch",
    alignItems: "flex-start",
    paddingVertical: Spacing.two,
  },
  cogButton: {
    padding: Spacing.two,
    borderRadius: Spacing.four,
  },
  actions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.four,
  },
  deck: {
    flex: 1,
    alignSelf: "stretch",
    // Clip cards to the frame so a swiped card disappears at the deck's edge
    // instead of flying across the rest of the screen — the next card stays
    // centered in a fixed photo frame.
    overflow: "hidden",
    borderRadius: Spacing.four,
  },
  card: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  skipButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    alignItems: "center",
  },
  decisionRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
  // Skip sits on its own line, centered — it shrinks to its content rather
  // than filling the width like the paired Throw/Keep buttons.
  skipRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  // Extra horizontal padding so the content-sized Skip button isn't cramped.
  skipButtonInline: {
    paddingHorizontal: Spacing.five,
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
  disabled: {
    opacity: 0.4,
  },
});
