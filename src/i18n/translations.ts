import type { Language } from "@/contexts/userContext";
import en from "./locales/en.json";
import de from "./locales/de.json";

// Every user-facing string in the app lives in the per-language JSON files under
// `locales/`, keyed by a flat dot-namespaced id. The tables are kept in plain
// JSON (rather than inline `as const` objects) so the i18n Ally VS Code
// extension can read them and show the resolved string inline next to each
// `t("...")` call — see `.vscode/settings.json`. Metro/TS import JSON directly
// (`resolveJsonModule` is on via Expo's base tsconfig).
//
// `en` is the source of truth: `TranslationKey` is derived from it, and the
// checks below enforce at compile time that `de` supplies exactly the same
// keys — add a key to `en.json` and `de.json` must match, or the build fails.
//
// Interpolation: `{{name}}` placeholders are filled by `translate`'s `params`.
// The brand name "SwipeAndThrow" is deliberately left literal in both languages
// (it's also the album name — see KEEP_ALBUM_TITLE), and the album name is
// passed in as `{{album}}` rather than translated.

// The set of valid translation keys, derived from the English block so every
// lookup is checked at compile time.
export type TranslationKey = keyof typeof en;

// Each language must define exactly the same keys. Assigning `de` into this
// shape catches any key missing from `de.json`; the `never` assertion below
// catches any extra key `de.json` has that `en.json` doesn't — together they
// enforce an exact match, the same guarantee the old inline object literal gave.
type Translations = Record<TranslationKey, string>;

const _deHasEveryKey: Translations = de;
void _deHasEveryKey;

type ExtraDeKeys = Exclude<keyof typeof de, TranslationKey>;
const _deHasNoExtraKeys: ExtraDeKeys extends never ? true : never = true;
void _deHasNoExtraKeys;

const translations: Record<Language, Translations> = { en, de };

// Fills every `{{name}}` placeholder in `text` from `params`. A placeholder
// with no matching param is left as-is rather than turning into "undefined".
function interpolate(
  text: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

// Looks up a key in the given language and interpolates any params. Falls back
// to the English string if the language somehow lacks the key, so a gap never
// renders an empty label.
export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const value = translations[language][key] ?? translations.en[key];
  return interpolate(value, params);
}

// Keys that come in `_one` / `_other` plural variants. `translate` handles the
// singular keys; this narrows the plural base keys so a typo is caught.
export type PluralBaseKey = "albums.photoCount" | "apply.copyWarning";

// Picks the `_one` variant when count is exactly 1, otherwise `_other`, and
// always passes `count` through for interpolation. English and German share the
// same one/other split, so this simple rule covers both.
export function translatePlural(
  language: Language,
  baseKey: PluralBaseKey,
  count: number,
  params?: Record<string, string | number>,
): string {
  const suffix = count === 1 ? "_one" : "_other";
  const key = `${baseKey}${suffix}` as TranslationKey;
  return translate(language, key, { count, ...params });
}
