import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

/**
 * Root index screen - handles auth-based routing only.
 * Shows a loading spinner while determining where to redirect.
 */
export default function IndexScreen() {
  const router = useRouter();
  const { state } = useAuth();

  // Profile is considered "loaded" if:
  // - No session exists (no need for profile)
  // - Profile exists (successfully loaded)
  // - Session exists but profile is null AND we've waited a bit (trigger might be delayed)
  const [profileLoadTimeout, setProfileLoadTimeout] = React.useState(false);
  
  React.useEffect(() => {
    if (state.session && state.profile === null) {
      // Give the trigger time to create the profile (max 2 seconds)
      const timer = setTimeout(() => setProfileLoadTimeout(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setProfileLoadTimeout(false);
    }
  }, [state.session, state.profile]);

  const profileLoaded = !state.session || state.profile !== null || profileLoadTimeout;
  const showLoading = state.isLoading || (state.session && !profileLoaded);

  useEffect(() => {
    if (showLoading) return;

    if (state.session) {
      // User is logged in
      // Note: Explicit routing after OTP verification is handled in auth.tsx
      // This only handles app initialization/reloads
      if (state.profile?.onboarding_completed_at) {
        // Onboarding completed → go to main app
        router.replace("/(tabs)");
      } else if (state.profile === null) {
        // Profile is null (new signup, trigger might be delayed) → go to onboarding
        router.replace("/onboarding");
      } else {
        // Profile exists but onboarding not completed
        // For app reloads: if user has a profile, they're logged in → go to main app
        // (The explicit routing in auth.tsx handles new signups → onboarding)
        router.replace("/(tabs)");
      }
    } else if (state.isGuest) {
      // Guest user → go to main app
      router.replace("/(tabs)");
    } else {
      // Not logged in → show auth screen
      router.replace("/auth");
    }
  }, [showLoading, state.session, state.profile, state.isGuest, profileLoadTimeout]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#A8C6B6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7f2",
  },
});
