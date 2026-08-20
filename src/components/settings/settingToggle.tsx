import { useTheme } from "@/hooks/useTheme";
import { Switch } from "react-native";
import { SettingRow } from "./settingRow";

// A labelled on/off setting: the shared SettingRow layout with a native Switch
// as its control. The parent owns the value and decides what a change means
// (e.g. requesting permission first), so this stays a controlled component.
export function SettingToggle({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <SettingRow label={label} hint={hint}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.backgroundElement,
          true: theme.backgroundSelected,
        }}
        thumbColor={theme.text}
      />
    </SettingRow>
  );
}
