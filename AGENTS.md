# SwipeAndThrow

A mobile app for cleaning up the photos on your phone through a Tinder-style
swipe interface. The app serves one photo at a time; the user makes a fast
keep-or-discard decision with a swipe gesture. The goal is to make photo
cleanup feel quick and low-friction instead of a tedious chore in the stock
gallery app.

Primary target platform: **Android** (tested on emulator/device).

## Hard rules

- **Photos only.** This app deals with images and nothing else. Never add
  audio/music, video, or any other media handling — no `MediaType.AUDIO` or
  `MediaType.VIDEO` queries, no audio libraries, no sound effects. Every
  media-library query must filter to `MediaType.IMAGE`, and anything that
  lists albums/collections must exclude those that hold no images.
- **Expo has changed.** Read the exact versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing any code.
- **No decision touches the gallery until the user applies the batch.** Both
  "Keep" and "Throw" only append to the in-memory `decisions` buffer, so every
  decision stays undoable and every photo sits in its original folder until
  then. Applying runs two batched calls: `album.add(assets)` moves the kept
  photos into the `SwipeAndThrow` album (created on first use), then
  `Asset.delete(assets)` deletes the thrown ones. Each is a single native call
  behind one Android system dialog, and the two phases run independently — a
  refused move must never cost the user their deletes, or the other way round.
  A phase that fails leaves its own photos buffered. Never add a path that
  deletes without going through that buffer and confirmation.
- **The buffer is memory-only.** Closing the app loses pending decisions;
  that's accepted, since nothing has been moved or deleted yet. Don't "fix"
  it by applying decisions eagerly.
- **Applying moves photos out of their original folders.** Kept photos land in
  `Pictures/SwipeAndThrow/` — the album root is hardcoded per media type in the
  library (`MimeType.albumRootDirectory()`), so it can't be pointed at `DCIM/`
  without patching. `album.add()` does respect an existing album's real path,
  unlike `Album.create()`.
- **Photos in another app's `Android/media/<package>` folder can't be moved.**
  MediaStore rejects the ownership change (`IllegalArgumentException: Changing
  ownership ... not allowed`), which affects WhatsApp/Telegram media. Keeping
  those copies them into the album (`Album.create(..., moveAssets: false)`)
  and then deletes the originals. Deleting them works normally. Keeps are
  grouped by source folder and applied one call per group, so an unmovable
  folder can't fail the rest of the batch.

## Tech stack

- Expo SDK 57 + Expo Router (file-based routing)
- React Native 0.86, React 19, TypeScript (`strict`)
- Gestures/animation: `react-native-gesture-handler`, `react-native-reanimated`
- `expo-media-library` — reads and deletes photos from the device gallery
  (images only — see the photos-only hard rule).
  Config plugin is registered in `app.json` (permission strings + Android
  manifest entries). Request permissions at runtime before accessing photos.

## Project structure & conventions

- All app code lives in `src/`.
- Path alias `@/*` → `src/*` (e.g. `@/components/themed-text`). Prefer it over
  long relative imports.
- Routes/screens live in `src/app/` (Expo Router file-based routing).
- Reusable UI in `src/components/`, hooks in `src/hooks/`, shared values in
  `src/constants/`.
- Platform-specific files use the `.web.tsx` / `.native.tsx` suffix pattern
  (see `animated-icon.tsx` + `animated-icon.web.tsx`). Keep both in sync.
- File names are kebab-case (`themed-view.tsx`, `use-theme.ts`).
- TypeScript is `strict` — no implicit `any`, handle nulls.

## Commands

```bash
npm run android   # primary: start on Android emulator/device
npm start         # Expo dev server (pick a target from the menu)
npm run web       # run in browser via react-native-web
npm run lint      # expo lint
```

## Working style

- Explain the intended change before editing files, then make it.
- Keep changes small and focused; match the style of surrounding code.
