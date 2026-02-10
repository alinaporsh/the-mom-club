import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../theme";

type TagPillProps = {
  label: string;
  tone?: "neutral" | "accent";
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function TagPill({ label, tone = "neutral", style, textStyle }: TagPillProps) {
  const containerStyle = [
    styles.base,
    tone === "accent" ? styles.accent : styles.neutral,
    style,
  ];
  const labelStyle = [
    styles.text,
    tone === "accent" && styles.textAccent,
    textStyle,
  ];

  return (
    <View style={containerStyle}>
      <Text style={labelStyle} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 6,
    maxWidth: 140,
  },
  neutral: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  accent: {
    backgroundColor: colors.primarySoft,
    borderWidth: 0,
  },
  text: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  textAccent: {
    color: colors.textPrimary,
  },
});

