import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { StyleSheet, TextInput } from "react-native";
import { SettingRow } from "./settingRow";

// Free-text setting for the keep-album name. Renaming orphans the old album,
// so the hint warns before the user commits to it.
export function KeepAlbumInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const theme = useTheme();

  return (
    <SettingRow
      label="Keep album"
      hint="Where kept photos are moved. Renaming this orphans the old album, so photos already kept there will come up for review again."
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />
    </SettingRow>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    fontSize: 16,
  },
});
