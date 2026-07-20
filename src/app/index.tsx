import { Image } from "expo-image";
import {
  AssetField,
  MediaType,
  Query,
  usePermissions,
  type Asset,
} from "expo-media-library";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const PHOTO_BATCH_SIZE = 50;

export default function HomeScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = usePermissions();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [index, setIndex] = useState(0);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Photos the user chose to throw. Held in memory only — nothing is deleted
  // yet. Real deletion must be confirmable/undoable (see AGENTS.md).
  const [pendingDelete, setPendingDelete] = useState<Asset[]>([]);

  const hasPhoto = currentUri !== null;

  // Resolve the current asset's display uri whenever the queue or index moves.
  useEffect(() => {
    if (assets.length === 0) {
      setCurrentUri(null);
      return;
    }

    if (index >= assets.length) {
      setCurrentUri(null);
      setAssets([]);
      setIndex(0);
      Alert.alert(
        "All caught up",
        `You reviewed all ${assets.length} photos. ${pendingDelete.length} marked to throw.`
      );
      return;
    }

    let active = true;
    setCurrentUri(null);
    assets[index]
      .getInfo()
      .then((info) => {
        if (active) setCurrentUri(info.uri);
      })
      .catch(() => {
        if (active) setIndex((i) => i + 1);
      });

    return () => {
      active = false;
    };
  }, [assets, index, pendingDelete.length]);

  function handleSettings() {
    // TODO: navigate to the settings screen
  }

  async function handlePickPicture() {
    let response = permission;
    if (!response?.granted) {
      response = await requestPermission();
    }
    if (!response.granted) {
      Alert.alert(
        "Permission needed",
        "SwipeAndThrow needs access to your photos to help you clean them up."
      );
      return;
    }

    try {
      setLoading(true);
      const results = await new Query()
        .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(PHOTO_BATCH_SIZE)
        .exe();

      if (results.length === 0) {
        Alert.alert("No photos", "We couldn't find any photos on your device.");
        return;
      }

      setPendingDelete([]);
      setIndex(0);
      setAssets(results);
    } catch {
      Alert.alert("Something went wrong", "Couldn't load your photos.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeep() {
    setIndex((i) => i + 1);
  }

  function handleThrow() {
    const asset = assets[index];
    if (asset) setPendingDelete((prev) => [...prev, asset]);
    setIndex((i) => i + 1);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.topBar}>
          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.settingsButton}>
              <SymbolView
                tintColor={theme.text}
                name={{
                  ios: "gearshape",
                  android: "settings",
                  web: "settings",
                }}
                size={14}
              />
              <ThemedText type="small">Settings</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.actions}>
          {hasPhoto ? (
            <ThemedView type="backgroundElement" style={styles.photoCard}>
              <Image
                source={{ uri: currentUri }}
                style={styles.photo}
                contentFit="contain"
              />
              <ThemedText type="small" themeColor="textSecondary">
                {index + 1} / {assets.length}
              </ThemedText>
            </ThemedView>
          ) : (
            <Pressable
              onPress={handlePickPicture}
              disabled={loading}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundSelected" style={styles.mainButton}>
                <ThemedText type="subtitle">
                  {loading ? "Loading…" : "Pick a picture"}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}

          <ThemedView style={styles.decisionRow}>
            <Pressable
              onPress={handleKeep}
              disabled={!hasPhoto}
              style={({ pressed }) => [
                styles.decisionPressable,
                (pressed || !hasPhoto) && styles.pressed,
              ]}
            >
              <ThemedView
                type="backgroundElement"
                style={styles.decisionButton}
              >
                <SymbolView
                  tintColor="#34c759"
                  name={{ ios: "checkmark", android: "check", web: "check" }}
                  size={18}
                />
                <ThemedText type="smallBold">Keep</ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable
              onPress={handleThrow}
              disabled={!hasPhoto}
              style={({ pressed }) => [
                styles.decisionPressable,
                (pressed || !hasPhoto) && styles.pressed,
              ]}
            >
              <ThemedView
                type="backgroundElement"
                style={styles.decisionButton}
              >
                <SymbolView
                  tintColor="#ff3b30"
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  size={18}
                />
                <ThemedText type="smallBold">Throw</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: Spacing.two,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  actions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.four,
  },
  mainButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: "center",
  },
  photoCard: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  photo: {
    flex: 1,
    width: "100%",
    borderRadius: Spacing.three,
  },
  decisionRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignSelf: "stretch",
  },
  decisionPressable: {
    flex: 1,
  },
  decisionButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
