import { Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./common/themedText";

type Props = {
  text: string;
  color: string;
  align: "left" | "right" | "center";
};

// The badge that fades in over a card as it's dragged, telling the user which
// decision the current swipe direction will make.
export default function SwipeLabel({ text, color, align }: Props) {
  return (
    <View
      style={[
        styles.container,
        align === "left" && styles.left,
        align === "right" && styles.right,
        align === "center" && styles.center,
      ]}
    >
      <View style={[styles.badge, { borderColor: color }]}>
        <ThemedText type="smallBold" style={{ color }}>
          {text}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  left: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  center: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  badge: {
    borderWidth: 3,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
