export const PHOTO_BATCH_SIZE = 50;

// Gallery album kept photos are moved into. Doubles as the "already reviewed"
// marker: assets living here are filtered out of new batches.
export const KEEP_ALBUM_TITLE = "SwipeAndThrow";

// Photos inside another app's `Android/media/<package>` directory (WhatsApp,
// Telegram, …) are owned by that app. MediaStore refuses to change their
// ownership, so they can't be moved out — they have to be copied and the
// originals deleted instead.
export const APP_OWNED_MEDIA = /\/Android\/media\//;
