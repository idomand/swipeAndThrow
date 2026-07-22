import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { UserProvider } from "@/contexts/userContext";
import { useResolvedScheme } from "@/hooks/useTheme";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

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

  return (
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
          options={{ presentation: "fullScreenModal", title: "Settings" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
