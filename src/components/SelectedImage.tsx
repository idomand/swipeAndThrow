import { Spacing } from "@/constants/theme";
import { Image } from "expo-image";
import { Asset } from "expo-media-library";
import { StyleSheet } from "react-native";
import { ThemedText } from "./common/themedText";
import { ThemedView } from "./common/themedView";

type Props = {
  showPhoto: boolean;
  currentUri: string | null;
  assets: Asset[];
};

export default function SelectedImage({
  showPhoto,
  currentUri,
  assets,
}: Props) {
  return (
    <>
      {showPhoto && currentUri && (
        <ThemedView type="backgroundElement" style={styles.photoCard}>
          <Image
            source={{ uri: currentUri }}
            style={styles.photo}
            contentFit="contain"
          />
          <ThemedText type="small" themeColor="textSecondary">
            {assets.length} left
          </ThemedText>
        </ThemedView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
});
