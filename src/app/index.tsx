import ThemedContainer from "@/components/common/themedContainer";
import { HomeHeader } from "@/components/home/homeHeader";
import { PhotoReview } from "@/components/home/photoReview";
import { useFirstRunAbout } from "@/hooks/useFirstRunAbout";
import { router } from "expo-router";

export default function HomeScreen() {
  // Show the About screen once, the first time the app is ever opened.
  useFirstRunAbout();

  return (
    <ThemedContainer>
      <HomeHeader onPressSettings={() => router.push("/settings")} />
      <PhotoReview />
    </ThemedContainer>
  );
}
