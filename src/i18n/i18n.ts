import { createI18n } from "vue-i18n";
import de from "./locales/de.json";
import en from "./locales/en.json";

// set <html lang="...">
document.querySelector("html")!.setAttribute("lang", "en");

let i18n = createI18n({
  locale: "en",
  fallbackLocale: "de",
  messages: { de, en },
  warnHtmlInMessage: "off",
});

export function changeLocale(locale: "en" | "de") {
  i18n.global.locale = locale;
  document.querySelector("html")!.setAttribute("lang", locale);
}

export default i18n;
