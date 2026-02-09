import { Image, StyleSheet, ViewStyle, View } from "react-native";

type LogoSize = "small" | "medium" | "large";

const sizeMap = {
  small: { width: 120, height: 80 },
  medium: { width: 180, height: 120 },
  large: { width: 240, height: 160 },
};

type Props = {
  size?: LogoSize;
  style?: ViewStyle;
};

export function Logo({ size = "medium", style }: Props) {
  const s = sizeMap[size];

  return (
    <View style={[styles.wrapper, style]}>
      <Image
        source={require("../assets/images/mom_club_logo.png")}
        style={{ width: s.width, height: s.height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
