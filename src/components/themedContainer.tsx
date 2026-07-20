import { ThemedView, type ThemedViewProps } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type ThemedContainerProps = ThemedViewProps & {
  // Applied to the inner safe-area layer, where the screen's content lives.
  contentStyle?: StyleProp<ViewStyle>;
};

// Full-screen themed background with a width-capped, safe-area-inset content
// column inside it. Screens render their content as children.
export default function ThemedContainer({
  style,
  contentStyle,
  children,
  ...otherProps
}: ThemedContainerProps) {
  return (
    <ThemedView style={[styles.container, style]} {...otherProps}>
      <SafeAreaView style={[styles.safeArea, contentStyle]}>
        {children}
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
});
