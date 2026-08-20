import { ThemedText } from "@/components/common/themedText";
import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { useUserContext } from "@/contexts/userContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Album,
  AssetField,
  MediaType,
  Query,
  usePermissions,
} from "expo-media-library";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SettingRow } from "./settingRow";
import { SettingsButton } from "./settingsButton";

// A single gallery album, reduced to what the picker needs to display it.
type AlbumEntry = { id: string; title: string; photoCount: number };

// Lets the user pick which gallery albums the app draws photos from. The button
// opens a modal that lists every album holding at least one image; the caller's
// stored selection (a list of album ids on the user settings) is what gets
// updated on "Done". Empty selection means "all albums".
export function SelectAlbums() {
  const { settings, setSetting } = useUserContext();
  const { t } = useTranslation();
  const [permission, requestPermission] = usePermissions();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  // Local working copy so toggles don't persist until the user confirms.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function loadAlbums() {
    try {
      const all = await Album.getAll();
      const entries = await Promise.all(
        all.map(async (album) => {
          // Photos only — count images so albums with no images (video/music)
          // can be filtered out below.
          const photos = await new Query()
            .album(album)
            .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
            .exe();

          return {
            id: album.id,
            title: await album.getTitle(),
            photoCount: photos.length,
          };
        }),
      );

      setAlbums(entries.filter((entry) => entry.photoCount > 0));
    } catch (error) {
      console.log("Couldn't read albums", error);
      setAlbums([]);
    }
  }

  async function openModal() {
    // Fresh working copy from what's stored, so cancelling discards edits.
    setSelected(new Set(settings.selectedAlbumIds));
    setOpen(true);
    setLoading(true);

    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        setLoading(false);
        return;
      }
    }

    await loadAlbums();
    setLoading(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    await setSetting("selectedAlbumIds", [...selected]);
    setOpen(false);
  }

  const count = settings.selectedAlbumIds.length;

  return (
    <SettingRow label={t("albums.label")} hint={t("albums.hint")}>
      <SettingsButton
        label={count === 0 ? t("albums.all") : t("albums.selected", { n: count })}
        onPress={openModal}
      />

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <ThemedContainerModal>
          <ThemedText type="subtitle">{t("albums.modalTitle")}</ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {albums.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t("albums.empty")}
                </ThemedText>
              ) : (
                albums.map((album) => (
                  <AlbumRow
                    key={album.id}
                    album={album}
                    selected={selected.has(album.id)}
                    onPress={() => toggle(album.id)}
                  />
                ))
              )}
            </ScrollView>
          )}

          <ThemedView style={styles.footer}>
            <SettingsButton
              label={t("albums.cancel")}
              onPress={() => setOpen(false)}
            />
            <SettingsButton label={t("albums.done")} onPress={save} />
          </ThemedView>
        </ThemedContainerModal>
      </Modal>
    </SettingRow>
  );
}

// One tappable album row with a title, its photo count, and a check when picked.
function AlbumRow({
  album,
  selected,
  onPress,
}: {
  album: AlbumEntry;
  selected: boolean;
  onPress: () => void;
}) {
  const { tp } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "backgroundElement"}
        style={styles.albumRow}
      >
        <ThemedView style={styles.albumText}>
          <ThemedText type={selected ? "smallBold" : "small"}>
            {album.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {tp("albums.photoCount", album.photoCount)}
          </ThemedText>
        </ThemedView>
        {selected && <ThemedText type="smallBold">✓</ThemedText>}
      </ThemedView>
    </Pressable>
  );
}

// The modal body: fills the sheet with the themed background and pads it.
function ThemedContainerModal({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.modal, { backgroundColor: theme.background }]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  loading: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
  },
  albumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  albumText: {
    backgroundColor: "transparent",
    gap: Spacing.half,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
