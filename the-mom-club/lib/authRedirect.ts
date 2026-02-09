import * as Linking from "expo-linking";

/** URL Supabase uses after magic link / OAuth (emailRedirectTo). */
export function getAuthRedirectUrl(): string {
  return Linking.createURL("/(tabs)", { scheme: "the-mom-club" });
}
