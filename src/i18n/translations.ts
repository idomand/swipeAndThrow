import type { Language } from "@/contexts/userContext";

// Every user-facing string in the app, keyed by a flat dot-namespaced id and
// available in each supported language. Mirrors the `Colors` dictionary in
// `constants/theme.ts`: a plain `as const` object the UI indexes by the stored
// preference. Add a key to `en` and the `de` block must supply it too — the
// `Translations` type below enforces that at compile time.
//
// Interpolation: `{{name}}` placeholders are filled by `translate`'s `params`.
// The brand name "SwipeAndThrow" is deliberately left literal in both languages
// (it's also the album name — see KEEP_ALBUM_TITLE), and the album name is
// passed in as `{{album}}` rather than translated.
const en = {
  // Home screen — swipe overlay badges and decision buttons.
  "home.keep": "Keep",
  "home.throw": "Throw",
  "home.skip": "Skip",
  "home.undo": "Undo",
  "home.apply": "Apply {{n}}",
  "home.applying": "Applying…",
  "home.remaining": "{{n}} left",
  "home.loading": "Loading…",
  "home.noPhotos": "No photos to review",
  "home.checkAgain": "Check again",

  // Home screen — alerts.
  "alert.permissionTitle": "Permission needed",
  "alert.permissionBody":
    "SwipeAndThrow needs access to your photos to help you clean them up.",
  "alert.allCaughtUpTitle": "All caught up",
  "alert.allCaughtUpBody": "No photos left to review.",
  "alert.loadFailTitle": "Something went wrong",
  "alert.loadFailBody": "Couldn't load your photos.",

  // Applying decisions — result alert titles, notes, and per-phase problems.
  "apply.someFailedTitle": "Some photos weren't handled",
  "apply.doneWithNotesTitle": "Done, with notes",
  "apply.stillPending": "Those photos are untouched and still pending.",
  "apply.copyWarning_one":
    "{{count}} photo from {{folder}} was copied to the album, but its original couldn't be removed — you may see duplicates.",
  "apply.copyWarning_other":
    "{{count}} photos from {{folder}} were copied to the album, but their originals couldn't be removed — you may see duplicates.",
  "apply.keepFail": "Keeping {{n}} from {{folder}}: {{error}}",
  "apply.keepPhaseFail": "Keeping photos: {{error}}",
  "apply.throwFail": "Throwing {{n}}: {{error}}",

  // Settings screen.
  "settings.themeLabel": "Theme",
  "settings.themeHint": "Overrides your device's appearance.",
  "settings.themeOption.system": "System",
  "settings.themeOption.light": "Light",
  "settings.themeOption.dark": "Dark",
  "settings.languageLabel": "Language",
  "settings.languageHint": "The language used throughout the app.",
  "settings.reminderLabel": "Daily reminder",
  "settings.reminderHint":
    "Get a daily notification to review and clean up your photos.",
  "settings.reminderTimeLabel": "Reminder time",
  "settings.reminderTimeHint": "When the daily reminder is sent.",
  "settings.done": "Done",
  "settings.aboutTitle": "About this app",
  "settings.aboutDesc":
    "How it works, permissions, and what happens when you apply.",
  "settings.notifOffTitle": "Notifications are off",
  "settings.notifOffBody":
    "Enable notifications for SwipeAndThrow in your device settings to get a daily reminder.",

  // Album picker.
  "albums.label": "Albums",
  "albums.hint":
    "Which albums photos are drawn from. Choose none to include them all.",
  "albums.all": "All albums",
  "albums.selected": "{{n}} selected",
  "albums.modalTitle": "Select albums",
  "albums.empty": "No albums with photos were found.",
  "albums.cancel": "Cancel",
  "albums.done": "Done",
  "albums.photoCount_one": "{{count}} photo",
  "albums.photoCount_other": "{{count}} photos",

  // About screen. The two "run" groups make up one sentence each, split around
  // an inline bold word so the same JSX works when German reorders the text.
  "about.aboutTitle": "About SwipeAndThrow",
  "about.aboutBody":
    "A fast, low-friction way to clean up your photos. You're shown one picture at a time — swipe to keep it or throw it away, like a deck of cards.",
  "about.howHeading": "How it works",
  "about.howRun1":
    "Swiping never touches your gallery. Every decision just goes into a list you can undo, and nothing is moved or deleted until you tap",
  "about.howApplyWord": "Apply",
  "about.howRun2": ". Photos you keep are gathered into an album called",
  "about.howRun3":
    ", which also remembers what you've already reviewed across restarts.",
  "about.permHeading": "Permissions",
  "about.permBody":
    "SwipeAndThrow needs access to your photos to show them and organize them into albums. Nothing ever leaves your device. You can review or change this permission any time in your device settings.",
  "about.openSettings": "Open device settings",
  "about.applyHeading": "Applying your decisions",
  "about.applyRun1":
    "When you apply, Android asks you to confirm the changes. For photos that came from other apps — like WhatsApp or Telegram — the system can't simply re-file them, so keeping one copies it into your album and removes the original. Because of that, the confirmation dialog may say",
  "about.applyMoveWord": '"move"',
  "about.applyRun2": "rather than delete.",
  "about.applySafe":
    "This is expected and safe — the photos you keep still end up in your {{album}} album.",
  "about.gotIt": "Got it",

  // Notifications (baked at schedule time — see lib/notifications.ts).
  "notif.channel": "Daily reminder",
  "notif.title": "Time to tidy your photos",
  "notif.body": "A quick swipe session keeps your gallery clean.",

  // Navigation header titles.
  "nav.settings": "Settings",
  "nav.about": "About",
} as const;

// The set of valid translation keys, derived from the English block so every
// lookup is checked at compile time.
export type TranslationKey = keyof typeof en;

// Each language must define exactly the same keys; the German block is checked
// against this shape below.
type Translations = Record<TranslationKey, string>;

const de: Translations = {
  "home.keep": "Behalten",
  "home.throw": "Wegwerfen",
  "home.skip": "Überspringen",
  "home.undo": "Rückgängig",
  "home.apply": "{{n}} anwenden",
  "home.applying": "Wird angewendet…",
  "home.remaining": "Noch {{n}}",
  "home.loading": "Wird geladen…",
  "home.noPhotos": "Keine Fotos zu prüfen",
  "home.checkAgain": "Erneut prüfen",

  "alert.permissionTitle": "Berechtigung erforderlich",
  "alert.permissionBody":
    "SwipeAndThrow braucht Zugriff auf deine Fotos, um beim Aufräumen zu helfen.",
  "alert.allCaughtUpTitle": "Alles erledigt",
  "alert.allCaughtUpBody": "Keine Fotos mehr zu prüfen.",
  "alert.loadFailTitle": "Etwas ist schiefgelaufen",
  "alert.loadFailBody": "Deine Fotos konnten nicht geladen werden.",

  "apply.someFailedTitle": "Einige Fotos wurden nicht verarbeitet",
  "apply.doneWithNotesTitle": "Fertig, mit Hinweisen",
  "apply.stillPending": "Diese Fotos sind unverändert und weiterhin ausstehend.",
  "apply.copyWarning_one":
    "{{count}} Foto aus {{folder}} wurde ins Album kopiert, aber das Original konnte nicht entfernt werden — es können Duplikate auftreten.",
  "apply.copyWarning_other":
    "{{count}} Fotos aus {{folder}} wurden ins Album kopiert, aber ihre Originale konnten nicht entfernt werden — es können Duplikate auftreten.",
  "apply.keepFail": "{{n}} aus {{folder}} behalten: {{error}}",
  "apply.keepPhaseFail": "Fotos behalten: {{error}}",
  "apply.throwFail": "{{n}} wegwerfen: {{error}}",

  "settings.themeLabel": "Design",
  "settings.themeHint": "Überschreibt das Erscheinungsbild deines Geräts.",
  "settings.themeOption.system": "System",
  "settings.themeOption.light": "Hell",
  "settings.themeOption.dark": "Dunkel",
  "settings.languageLabel": "Sprache",
  "settings.languageHint": "Die in der gesamten App verwendete Sprache.",
  "settings.reminderLabel": "Tägliche Erinnerung",
  "settings.reminderHint":
    "Erhalte eine tägliche Benachrichtigung, um deine Fotos zu prüfen und aufzuräumen.",
  "settings.reminderTimeLabel": "Erinnerungszeit",
  "settings.reminderTimeHint": "Wann die tägliche Erinnerung gesendet wird.",
  "settings.done": "Fertig",
  "settings.aboutTitle": "Über diese App",
  "settings.aboutDesc":
    "Wie sie funktioniert, Berechtigungen und was beim Anwenden passiert.",
  "settings.notifOffTitle": "Benachrichtigungen sind aus",
  "settings.notifOffBody":
    "Aktiviere Benachrichtigungen für SwipeAndThrow in den Geräteeinstellungen, um eine tägliche Erinnerung zu erhalten.",

  "albums.label": "Alben",
  "albums.hint":
    "Aus welchen Alben Fotos gezogen werden. Wähle keins, um alle einzubeziehen.",
  "albums.all": "Alle Alben",
  "albums.selected": "{{n}} ausgewählt",
  "albums.modalTitle": "Alben auswählen",
  "albums.empty": "Keine Alben mit Fotos gefunden.",
  "albums.cancel": "Abbrechen",
  "albums.done": "Fertig",
  "albums.photoCount_one": "{{count}} Foto",
  "albums.photoCount_other": "{{count}} Fotos",

  "about.aboutTitle": "Über SwipeAndThrow",
  "about.aboutBody":
    "Eine schnelle, mühelose Art, deine Fotos aufzuräumen. Dir wird ein Bild nach dem anderen gezeigt — wische, um es zu behalten oder wegzuwerfen, wie ein Kartenstapel.",
  "about.howHeading": "So funktioniert es",
  "about.howRun1":
    "Das Wischen berührt deine Galerie nie. Jede Entscheidung landet nur in einer Liste, die du rückgängig machen kannst, und nichts wird verschoben oder gelöscht, bis du auf",
  "about.howApplyWord": "Anwenden",
  "about.howRun2": "tippst. Fotos, die du behältst, werden in einem Album namens",
  "about.howRun3":
    "gesammelt, das sich auch über Neustarts hinweg merkt, was du bereits geprüft hast.",
  "about.permHeading": "Berechtigungen",
  "about.permBody":
    "SwipeAndThrow braucht Zugriff auf deine Fotos, um sie anzuzeigen und in Alben zu organisieren. Nichts verlässt jemals dein Gerät. Du kannst diese Berechtigung jederzeit in den Geräteeinstellungen prüfen oder ändern.",
  "about.openSettings": "Geräteeinstellungen öffnen",
  "about.applyHeading": "Deine Entscheidungen anwenden",
  "about.applyRun1":
    "Wenn du anwendest, bittet dich Android, die Änderungen zu bestätigen. Bei Fotos aus anderen Apps — wie WhatsApp oder Telegram — kann das System sie nicht einfach neu einordnen, sodass das Behalten sie in dein Album kopiert und das Original entfernt. Deshalb sagt der Bestätigungsdialog möglicherweise",
  "about.applyMoveWord": "„verschieben“",
  "about.applyRun2": "statt löschen.",
  "about.applySafe":
    "Das ist zu erwarten und sicher — die Fotos, die du behältst, landen trotzdem in deinem {{album}}-Album.",
  "about.gotIt": "Verstanden",

  "notif.channel": "Tägliche Erinnerung",
  "notif.title": "Zeit, deine Fotos aufzuräumen",
  "notif.body": "Eine kurze Wisch-Sitzung hält deine Galerie sauber.",

  "nav.settings": "Einstellungen",
  "nav.about": "Über",
};

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
