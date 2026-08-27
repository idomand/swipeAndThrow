import { KEEP_ALBUM_TITLE, PHOTO_BATCH_SIZE } from "@/constants/values";
import { type UserSettings } from "@/contexts/userContext";
import { getAlbumName } from "@/helpers/getAlbumName";
import { sample } from "@/helpers/sample";
import { useTranslation } from "@/i18n/useTranslation";
import { type Decision } from "@/lib/decisionBuffer";
import {
  Album,
  Asset,
  AssetField,
  MediaType,
  Query,
  usePermissions,
} from "expo-media-library";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Alert } from "react-native";
import { type SwiperCardRefType } from "rn-swiper-list";

// A photo in the deck, with its uri resolved up front so the whole card stack
// can render at once — the swiper needs every card ready, not one at a time.
// The extra fields feed the tap-to-reveal info overlay; `album` is derived from
// the source folder path (there's no album id on an asset).
type PhotoCardData = {
  asset: Asset;
  uri: string;
  album: string;
  creationTime: number | null;
  isFavorite: boolean;
};

// The plain, serializable shape handed to the swiper. `Asset` is a
// native-backed class the swiper's worklets can't copy to the UI thread
// ("Cannot copy value of type Asset"), so the asset itself never goes in —
// the swipe callbacks look it up by deck position through `cardsRef` instead.
export type DeckItem = {
  id: string;
  uri: string;
  album: string;
  creationTime: number | null;
  isFavorite: boolean;
};

// The settings that shape a batch, folded into one comparable string. Only
// these change what the gallery query returns, so the deck is reloaded on
// returning from Settings when this differs from what the current deck was
// built with — the theme, for one, doesn't warrant a reload.
function deckSignature(settings: UserSettings) {
  return settings.selectedAlbumIds.join(",");
}

type UsePhotoDeckArgs = {
  settings: UserSettings;
  decisionsRef: MutableRefObject<Decision<Asset>[]>;
  skippedIdsRef: MutableRefObject<string[]>;
  // Reset the deck's undo history when a fresh batch loads — the swiper can
  // only restore a card still on screen.
  onBatchLoaded: () => void;
  // A card was swiped: record the keep/throw decision, or the skip. The deck
  // owns the `cardsRef` lookup and hands the resolved `Asset` back out.
  onDecision: (action: "keep" | "throw", asset: Asset) => void;
  onSkip: (asset: Asset) => void;
};

// The deck-loading engine: owns the current deck, how far the user has swiped,
// the gallery-scan session caches, and the swipe callbacks. Reads the buffer's
// exclusion sets through the refs passed in so a load from `onSwipedAll` sees
// the latest decisions.
export function usePhotoDeck({
  settings,
  decisionsRef,
  skippedIdsRef,
  onBatchLoaded,
  onDecision,
  onSkip,
}: UsePhotoDeckArgs) {
  const { t } = useTranslation();
  const [permission, requestPermission] = usePermissions();

  // The current deck of photos and how far through it the user has swiped.
  // `batchKey` remounts the swiper on every new batch so its internal index
  // resets to the top of the fresh stack.
  const [cards, setCards] = useState<PhotoCardData[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [batchKey, setBatchKey] = useState(0);
  const [loading, setLoading] = useState(false);

  // Imperative handle on the deck so the Keep/Throw/Skip buttons drive the same
  // swipes as the gestures, and Undo can spring the last card back.
  const swiperRef = useRef<SwiperCardRefType>(null);

  // `onSwipedAll` fires from a worklet reaction that captured an earlier
  // render's closures, and the swipe callbacks are memoized. Reading the
  // current cards through a ref keeps each swipe looking up the live deck.
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
    cardsRef.current = cards;
  }, [cards]);

  // What the swiper actually renders: the same order as `cards`, but stripped
  // to serializable fields so nothing native crosses into a worklet.
  const deckData = useMemo<DeckItem[]>(
    () =>
      cards.map((card) => ({
        id: card.asset.id,
        uri: card.uri,
        album: card.album,
        creationTime: card.creationTime,
        isFavorite: card.isFavorite,
      })),
    [cards],
  );

  const hasDeck = cards.length > 0;
  const hasCard = hasDeck && activeCardIndex < cards.length;
  const remaining = cards.length - activeCardIndex;

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
      (id) => !reviewedIds.has(id) && !decidedIds.has(id) && !skipped.has(id),
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
            // One call gets the uri, creation time, and favorite flag together;
            // the album name is derived from the uri's source folder.
            const info = await asset.getInfo();
            return {
              asset,
              uri: info.uri,
              album: getAlbumName(info.uri),
              creationTime: info.creationTime ?? null,
              isFavorite: info.isFavorite,
            } as PhotoCardData;
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
      onBatchLoaded();
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

  // Clears the two session scan caches. Called after a successful apply, when
  // the gallery has changed under them: thrown photos are deleted and kept ones
  // moved into the keep album, so the next batch must re-scan.
  const invalidateCaches = useCallback(() => {
    candidatePoolRef.current = null;
    reviewedIdsRef.current = null;
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

  const onSwipeRight = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) onDecision("keep", card.asset);
      advanceWindow(index);
    },
    [onDecision, advanceWindow],
  );
  const onSwipeLeft = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) onDecision("throw", card.asset);
      advanceWindow(index);
    },
    [onDecision, advanceWindow],
  );
  const onSwipeTop = useCallback(
    (index: number) => {
      const card = cardsRef.current[index];
      if (card) onSkip(card.asset);
      advanceWindow(index);
    },
    [onSkip, advanceWindow],
  );
  const onIndexChange = useCallback((index: number) => {
    setActiveCardIndex(index);
  }, []);

  return {
    swiperRef,
    deckData,
    activeCardIndex,
    batchKey,
    loading,
    hasDeck,
    hasCard,
    remaining,
    loadBatch,
    invalidateCaches,
    onSwipeRight,
    onSwipeLeft,
    onSwipeTop,
    onIndexChange,
  };
}
