# SwipeAndThrow 📸

A mobile app for cleaning up the photos on your phone through a Tinder-style
swipe interface. The app serves one photo at a time and you make a fast
keep-or-discard decision with a swipe gesture — turning photo cleanup from a
tedious chore in the stock gallery into something quick and low-friction.

**Scope:** photos and images only — no music/audio, no video.

**Status:** early development · **Primary platform:** Android

## Tech stack

- [Expo](https://expo.dev) SDK 57 + [Expo Router](https://docs.expo.dev/router/introduction) (file-based routing)
- React Native 0.86, React 19, TypeScript (strict)
- [Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/) + [Gesture Handler](https://docs.expo.dev/versions/v57.0.0/sdk/gesture-handler/) for the swipe interactions

## Get started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app on Android:

   ```bash
   npm run android
   ```

   Or run `npm start` and pick a target from the Expo menu.

App code lives in the **`src/`** directory. Screens are in `src/app/`
(file-based routing), reusable UI in `src/components/`, hooks in `src/hooks/`.
Imports use the `@/` alias — e.g. `import { ThemedText } from '@/components/themed-text'`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run android` | Start on Android emulator/device |
| `npm start` | Start the Expo dev server |
| `npm run web` | Run in the browser (react-native-web) |
| `npm run lint` | Lint with `expo lint` |

## Contributing

Project conventions and rules for AI coding assistants live in
[`AGENTS.md`](./AGENTS.md). Before writing code, always check the exact
versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/.

> ⚠️ This app deletes users' photos. Any discard/delete flow must be explicit,
> guarded, and reversible where possible. See `AGENTS.md` for the full rule.
>
> 🖼️ Images only. Don't add audio/music or video handling — every media-library
> query filters to `MediaType.IMAGE`.
