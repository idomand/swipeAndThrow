import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { SettingRow } from "./settingRow";
import { SettingsButton } from "./settingsButton";

// Turns a stored "HH:mm" string into a Date for the picker's value. The date
// part is irrelevant in time mode, so today's date is fine.
function timeToDate(time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

// Formats a picked Date back into the stored "HH:mm" 24-hour string.
function dateToTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// The control for choosing when the daily reminder fires: a button showing the
// current time that opens the native Android time picker. Controlled — the
// parent owns the "HH:mm" value and persists it.
export function ReminderTimeRow({
  time,
  onTimeChange,
}: {
  time: string;
  onTimeChange: (time: string) => void;
}) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    // Android dismisses the dialog itself; hide our copy regardless of outcome.
    setShow(false);
    // "set" means confirmed; "dismissed" (cancel/back) leaves the time as-is.
    if (event.type === "set" && date) {
      onTimeChange(dateToTime(date));
    }
  }

  return (
    <SettingRow label="Reminder time" hint="When the daily reminder is sent.">
      <SettingsButton label={time} onPress={() => setShow(true)} />

      {show && (
        <DateTimePicker
          value={timeToDate(time)}
          mode="time"
          is24Hour
          onChange={handleChange}
        />
      )}
    </SettingRow>
  );
}
