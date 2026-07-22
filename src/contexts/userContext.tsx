import { KEEP_ALBUM_TITLE, PHOTO_BATCH_SIZE } from "@/constants/values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

// App-wide user settings. Everything here survives a restart — see the
// storage note below for what that means for the decisions buffer.
export type UserSettings = {
  // How many photos each gallery query pulls in one batch.
  photoBatchSize: number;
  // Overrides the OS color scheme when set to something other than "system".
  themePreference: ThemePreference;
  // Album kept photos are moved into, and the marker for "already reviewed".
  keepAlbumTitle: string;
};

// Falls back to the compiled-in constants, so a fresh install behaves exactly
// as it did before settings existed.
const DEFAULT_SETTINGS: UserSettings = {
  photoBatchSize: PHOTO_BATCH_SIZE,
  themePreference: "system",
  keepAlbumTitle: KEEP_ALBUM_TITLE,
};

// One key holding the whole object rather than a key per setting: a single
// read on startup, and writes can't half-apply.
const STORAGE_KEY = "userSettings";

type UserContextValue = {
  settings: UserSettings;
  // Updates one setting and persists the result. Async so callers can await
  // the write, but the in-memory value changes immediately either way.
  setSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  // False until the stored settings have been read. Consumers that would
  // otherwise flash the defaults should wait for this.
  loaded: boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

// Note this deliberately does NOT persist the pending decisions buffer — that
// stays memory-only by design, since nothing has touched the gallery until the
// user applies it.
export function UserProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        // Spread over the defaults so a settings key added in a later version
        // gets its default instead of being undefined on an existing install.
        if (stored && active) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch (error) {
        // A corrupt or unreadable blob shouldn't block the app — the defaults
        // are already in state, so just carry on with those.
        console.log("Couldn't read stored settings", error);
      } finally {
        if (active) setLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function persist(next: UserSettings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // The in-memory value still applies for this session; only the write
      // across restarts is lost.
      console.log("Couldn't save settings", error);
    }
  }

  async function setSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await persist(next);
  }

  async function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    await persist(DEFAULT_SETTINGS);
  }

  const value = { settings, setSetting, resetSettings, loaded };

  return <UserContext value={value}>{children}</UserContext>;
}

export function useUserContext() {
  const context = use(UserContext);
  if (!context) {
    throw new Error("useUserContext not found");
  }
  return context;
}
