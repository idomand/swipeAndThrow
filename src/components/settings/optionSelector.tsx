import { ThemedView } from "@/components/common/themedView";
import { Spacing } from "@/constants/theme";
import { StyleSheet } from "react-native";
import { SettingOption } from "./settingOption";
import { SettingRow } from "./settingRow";

// A labelled setting whose value is one of a fixed list, rendered as a row of
// pills. Generic over the value type so it drives both the numeric batch-size
// setting and the string theme setting.
export function OptionSelector<T extends string | number>({
  label,
  hint,
  options,
  selected,
  onSelect,
  renderLabel = String,
}: {
  label: string;
  hint: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  // Maps a value to its pill text; defaults to the value itself stringified.
  renderLabel?: (value: T) => string;
}) {
  return (
    <SettingRow label={label} hint={hint}>
      <ThemedView style={styles.row}>
        {options.map((option) => (
          <SettingOption
            key={option}
            label={renderLabel(option)}
            selected={selected === option}
            onPress={() => onSelect(option)}
          />
        ))}
      </ThemedView>
    </SettingRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
});
