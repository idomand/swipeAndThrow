import { useUserContext } from "@/contexts/userContext";
import {
  translate,
  translatePlural,
  type PluralBaseKey,
  type TranslationKey,
} from "@/i18n/translations";
import { useCallback } from "react";

// The i18n counterpart of `useTheme`: reads the stored language and returns
// bound lookup functions. Consumers re-render on a language change because the
// setting flows from `UserProvider` context, exactly like the theme does.
//
// - `t(key, params?)` — a single string with `{{var}}` interpolation.
// - `tp(baseKey, count, params?)` — the count-appropriate `_one`/`_other`
//   variant, with `count` passed through automatically.
export function useTranslation() {
  const { settings } = useUserContext();
  const language = settings.language;

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );

  const tp = useCallback(
    (
      baseKey: PluralBaseKey,
      count: number,
      params?: Record<string, string | number>,
    ) => translatePlural(language, baseKey, count, params),
    [language],
  );

  return { t, tp, language };
}
