# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The rules, tech stack, structure conventions, and commands live in `AGENTS.md`
(imported above) — read them. This file adds the runtime architecture that spans
several files and isn't obvious from any one of them.

## Architecture

The whole app is two screens under `src/app/` (Expo Router): `index.tsx` (the
swipe deck) and `settings.tsx`. `_layout.tsx` wraps everything in
`UserProvider` + `GestureHandlerRootView` and defines the two-screen Stack.

### The decision buffer (`src/app/index.tsx`)

This is the heart of the app and the file to read first. A swipe never touches
the gallery — it appends to an in-memory buffer that stays fully undoable until
the user taps **Apply**. State is split across three ordered lists so a single
Undo can reverse the last swipe whatever kind it was:

- `decisions` — ordered `{ action: "keep" | "throw", asset }`. The pending keep
  and delete sets are derived from this by filtering on `action`.
- `skippedIds` — photos left in place; the id just stops them reappearing this
  session.
- `history` — the per-deck sequence of `"keep" | "throw" | "skip"`, so Undo
  knows which buffer to pop and can spring the card back. Reset per batch: the
  swiper can only restore a card still on screen.

Two representation quirks drive a lot of the code:

- **`Asset` can't cross into a worklet.** `rn-swiper-list` runs swipe callbacks
  on the UI thread and can't copy the native-backed `Asset` class. So the deck
  is fed `DeckItem` (`{ id, uri }`, plain/serializable), and swipe callbacks
  look the real `Asset` back up by deck index through `cardsRef`.
- **State is mirrored into refs** (`decisionsRef`, `skippedIdsRef`, `cardsRef`,
  `loadingRef`). `onSwipedAll` fires from a captured worklet closure and the
  swipe callbacks are memoized, so reads go through refs to see the latest
  values. `loadBatch` is guarded by `loadingRef` against overlapping loads.

Other non-obvious mechanics: `batchKey` is a counter used as the `Swiper`'s
`key` to remount it (resetting its internal index) on each new batch;
`renderCard` only decodes images for a small window around `activeCardIndex`
because the swiper mounts every card up front and decoding ~50 full-size images
at once would blow memory; `activeCardIndex` is advanced from the swipe
callbacks (`advanceWindow`), not just the swiper's `onIndexChange`, which lags.

### Loading batches

`loadPhotoBatch` builds the eligible pool as lightweight metadata
(`loadCandidateMetadata`) — one `Query.album` per selected album, or the whole
image library when `settings.selectedAlbumIds` is empty — then excludes three
sets: photos already in the keep album (`loadReviewedIds`, which reads the album
named by the `KEEP_ALBUM_TITLE` constant in `constants/values.ts` —
`"SwipeAndThrow"`, hardcoded and no longer user-editable), photos already in
`decisions`, and `skippedIds`. The surviving pool is **shuffled, then sliced to
the first `PHOTO_BATCH_SIZE`** (a fixed constant, 20, also no longer
user-editable) — so the random draw happens across the whole pool before the
batch is cut, and only the chosen ids are rebuilt into `Asset`s. The keep album
thus doubles as
the persistent "already reviewed" marker across restarts.

### Applying (`handleApplyDecisions`)

Runs the two phases from the hard rule independently so one refusal can't cost
the other. Keeps are grouped by source folder (`groupKeepsByFolder`) and each
group is one native call (`applyKeepGroup`): folders under `Android/media/`
(matched by `APP_OWNED_MEDIA` in `constants/values.ts`) are copied-then-deleted
because MediaStore won't change their ownership; everything else is moved via
`album.add`/`Album.create`. Only ids that actually succeeded are cleared from
the buffer, so a failed group stays pending for retry. Success is silent — the
Android system dialogs already confirmed it; only failures/warnings alert.

### Settings & theming

`UserProvider` (`src/contexts/userContext.tsx`) holds `UserSettings` in one
AsyncStorage blob under `userSettings`, loaded once on startup. Stored values
are spread over `DEFAULT_SETTINGS` so a key added later gets its default on an
existing install. **The decisions buffer is deliberately not persisted** — see
the memory-only hard rule. `useResolvedScheme` (`src/hooks/useTheme.ts`) applies
`settings.themePreference` over the OS color scheme; `useTheme` returns the
matching `Colors` entry. Consumers gate on `loaded` to avoid flashing (and
accidentally writing over) the defaults.

### Path aliases

`@/*` → `src/*` and `@/assets/*` → `assets/*` (both in `tsconfig.json`).
