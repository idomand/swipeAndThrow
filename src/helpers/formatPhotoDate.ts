import type { Language } from "@/contexts/userContext";

// Formats a photo's creation time (epoch ms) as a short, locale-aware date for
// the info overlay. Returns `fallback` when the time is missing, so the card
// never shows an empty or "Invalid Date" line.

export function formatPhotoDate(
  creationTime: number | null,
  language: Language,
  fallback = "",
): string {
  if (creationTime == null) return fallback;
  return new Date(creationTime).toLocaleDateString(language, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
