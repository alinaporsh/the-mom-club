import { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";

export default function OnboardingScreen() {
  const router = useRouter();
  const { state, refreshProfileAndRole } = useAuth();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"pregnant" | "new_mom">("pregnant");
  const [dueDate, setDueDate] = useState("");
  const [babyAge, setBabyAge] = useState("");
  const [loading, setLoading] = useState(false);

  // If the user has already completed onboarding, don't let them see or reuse this screen.
  useEffect(() => {
    if (state.profile?.onboarding_completed_at) {
      router.replace("/(tabs)");
    }
  }, [state.profile?.onboarding_completed_at, router]);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    if (status === "pregnant" && !dueDate.trim()) {
      Alert.alert("Due date", "Please enter your due date (e.g. 2025-12-19).");
      return;
    }
    if (status === "new_mom" && !babyAge.trim()) {
      Alert.alert("Baby age", "Please enter your baby's age (e.g. 3 months).");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Error", "You must be signed in to complete onboarding.");
        setLoading(false);
        return;
      }
      const userId = session.user.id;
      const { error: invokeError } = await supabase.functions.invoke("onboarding-complete", {
        body: {
          name: name.trim(),
          status,
          due_date: status === "pregnant" ? dueDate.trim() || null : null,
          baby_age: status === "new_mom" ? babyAge.trim() || null : null,
        },
      });
      if (invokeError) {
        const now = new Date().toISOString();
        const { error: profileErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            name: name.trim(),
            email: session.user.email ?? undefined,
            status,
            due_date: status === "pregnant" ? dueDate.trim() || null : null,
            baby_age: status === "new_mom" ? babyAge.trim() || null : null,
            onboarding_completed_at: now,
            updated_at: now,
          },
          { onConflict: "id" }
        );
        if (profileErr) {
          Alert.alert("Error", profileErr.message);
          setLoading(false);
          return;
        }
        await supabase.from("memberships").upsert(
          { user_id: userId, role: "free", updated_at: now },
          { onConflict: "user_id" }
        );
      }
      await refreshProfileAndRole();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size="small" style={styles.logo} />
            <Text style={styles.title}>Join the club</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#B8A99A"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
          <View style={styles.row}>
            <Text style={styles.label}>I am...</Text>
            <View style={styles.pills}>
              <Pressable
                style={[styles.pill, status === "pregnant" && styles.pillActive]}
                onPress={() => setStatus("pregnant")}
                disabled={loading}
              >
                <Text style={[styles.pillText, status === "pregnant" && styles.pillTextActive]}>
                  Pregnant
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pill, status === "new_mom" && styles.pillActive]}
                onPress={() => setStatus("new_mom")}
                disabled={loading}
              >
                <Text style={[styles.pillText, status === "new_mom" && styles.pillTextActive]}>
                  New Mom
                </Text>
              </Pressable>
            </View>
          </View>
          {status === "pregnant" && (
            <TextInput
              style={styles.input}
              placeholder="Due date (e.g. 2025-12-19)"
              placeholderTextColor="#B8A99A"
              value={dueDate}
              onChangeText={setDueDate}
              editable={!loading}
            />
          )}
          {status === "new_mom" && (
            <TextInput
              style={styles.input}
              placeholder="Baby's age (e.g. 3 months)"
              placeholderTextColor="#B8A99A"
              value={babyAge}
              onChangeText={setBabyAge}
              editable={!loading}
            />
          )}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  keyboardView: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingVertical: 24, paddingBottom: 48 },
  header: { marginBottom: 24, alignItems: "center" },
  logo: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600", color: "#5C4A4A" },
  subtitle: { fontSize: 17, color: "#8B7355", marginTop: 8 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#5C4A4A",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  row: { marginBottom: 16 },
  label: { fontSize: 16, color: "#5C4A4A", marginBottom: 8 },
  pills: { flexDirection: "row", gap: 12 },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#A8C6B6",
    backgroundColor: "#FFF",
  },
  pillActive: { backgroundColor: "#A8C6B6", borderColor: "#A8C6B6" },
  pillText: { fontSize: 16, color: "#8B7355", fontWeight: "500" },
  pillTextActive: { color: "#FFF" },
  primaryButton: {
    backgroundColor: "#A8C6B6",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.85 },
  primaryButtonText: { fontSize: 17, fontWeight: "600", color: "#FFF" },
});
