# SwipeAndThrow

A mobile app for cleaning up the photos on your phone through a Tinder-style
swipe interface. The app serves one photo at a time; the user makes a fast
keep-or-discard decision with a swipe gesture. The goal is to make photo
cleanup feel quick and low-friction instead of a tedious chore in the stock
gallery app.

Primary target platform: **Android** (tested on emulator/device).

## Hard rules

- **Expo has changed.** Read the exact versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing any code.
- **Deleting photos is destructive and irreversible.** Any flow that discards
  or deletes a photo must be explicit, guarded, and reversible where possible
  (e.g. a confirm step, an "undo last swipe", or a trash/pending-delete buffer
  before the OS-level delete). Never wire a swipe gesture straight to a
  permanent delete without a safety net.

## Tech stack

- Expo SDK 57 + Expo Router (file-based routing)
- React Native 0.86, React 19, TypeScript (`strict`)
- Gestures/animation: `react-native-gesture-handler`, `react-native-reanimated`
- `expo-media-library` — reads and deletes photos from the device gallery.
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
