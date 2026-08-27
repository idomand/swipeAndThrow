import { useUserContext } from "@/contexts/userContext";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

// Shows the About screen once, the first time the app is ever opened. Gated on
// `loaded` so it never fires against the un-hydrated default settings. The flag
// is persisted at push time (not on dismiss) so a force-quit still counts as
// "seen"; the ref guards against a re-render firing a second push before the
// persisted flag propagates back through the provider.
export function useFirstRunAbout() {
  const { settings, setSetting, loaded } = useUserContext();

  const firstRunHandledRef = useRef(false);
  useEffect(() => {
    if (!loaded || settings.hasSeenInfo || firstRunHandledRef.current) return;
    firstRunHandledRef.current = true;
    setSetting("hasSeenInfo", true);
    router.push("/about");
  }, [loaded, settings.hasSeenInfo, setSetting]);
}
