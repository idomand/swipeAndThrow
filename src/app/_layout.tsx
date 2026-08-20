import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { UserProvider } from "@/contexts/userContext";
import { useDailyReminder } from "@/hooks/useDailyReminder";
import { useResolvedScheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}

// Split out from RootLayout so it can read the saved theme preference — the
// hook only works below the provider.
function RootNavigator() {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { t } = useTranslation();

  // Keeps the daily reminder notification in sync with settings on launch —
  // must live below UserProvider so it can read them.
  useDailyReminder();

  return (
    // Required by react-native-gesture-handler so the swipe deck on the home
    // screen receives gestures. Must wrap the whole navigation tree.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* Reached from the cog in the home screen header. Full screen rather
              than a sheet so the settings list gets the whole viewport. */}
          <Stack.Screen
            name="settings"
            options={{
              presentation: "fullScreenModal",
              title: t("nav.settings"),
            }}
          />
          {/* Reached from Settings and auto-opened once on first launch. Full
              screen so the info sections get the whole viewport. */}
          <Stack.Screen
            name="about"
            options={{ presentation: "fullScreenModal", title: t("nav.about") }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
