import { Stack } from "expo-router";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { AuthProvider } from "../contexts/AuthContext";
import { CommunityForumProvider } from "../contexts/CommunityForumContext";

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CommunityForumProvider>
          <RootLayoutNav />
        </CommunityForumProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
