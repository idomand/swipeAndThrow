/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useUserContext } from "@/contexts/userContext";
import { useColorScheme } from "react-native";

// The scheme actually in effect: the user's saved preference when they've
// picked one, otherwise whatever the OS reports.
export function useResolvedScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const { settings } = useUserContext();

  if (settings.themePreference !== "system") return settings.themePreference;
  return systemScheme === "dark" ? "dark" : "light";
}

export function useTheme() {
  return Colors[useResolvedScheme()];
}
