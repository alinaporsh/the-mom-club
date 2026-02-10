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
  Keyboard,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import { colors } from "./theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const { state, refreshProfileAndRole } = useAuth();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"pregnant" | "new_mom">("pregnant");
  const [dueDateValue, setDueDateValue] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [babyAgeNumber, setBabyAgeNumber] = useState<number | null>(null);
  const [babyAgeUnit, setBabyAgeUnit] = useState<"weeks" | "months">("months");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    dueDate: false,
    babyAge: false,
  });

  // If the user has already completed onboarding, don't let them see or reuse this screen.
  useEffect(() => {
    if (state.profile?.onboarding_completed_at) {
      router.replace("/(tabs)");
    }
  }, [state.profile?.onboarding_completed_at, router]);

  function formatDateForBackend(date: Date | null) {
    if (!date) return null;
    // Use YYYY-MM-DD, matching the placeholder format the backend expects
    return date.toISOString().slice(0, 10);
  }

  function formatDateForDisplay(date: Date | null) {
    if (!date) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getValidationState() {
    const trimmedName = name.trim();

    let nameError = "";
    if (!trimmedName) {
      nameError = "Name is required.";
    } else if (trimmedName.length < 2) {
      nameError = "Name must be at least 2 characters.";
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      nameError = "Letters and spaces only.";
    }

    let dueDateError = "";
    if (status === "pregnant" && !dueDateValue) {
      dueDateError = "Please select your due date.";
    }

    let babyAgeError = "";
    if (status === "new_mom" && !babyAgeNumber) {
      babyAgeError = "Please select your baby's age.";
    }

    const isValid =
      !nameError &&
      (status === "pregnant" ? !dueDateError : !babyAgeError);

    return { isValid, nameError, dueDateError, babyAgeError };
  }

  const { isValid: isFormValid, nameError, dueDateError, babyAgeError } =
    getValidationState();

  function handleNameChange(text: string) {
    // Allow only letters and spaces; strip numbers/symbols immediately.
    const sanitized = text.replace(/[^A-Za-z\s]/g, "");
    setName(sanitized);
  }

  function handleDueDateSelect(dateString: string) {
    const selectedDate = new Date(dateString);
    setDueDateValue(selectedDate);
    setTouched((prev) => ({ ...prev, dueDate: true }));
    setShowCalendar(false);
  }

  function handleSelectBabyAgeNumber(value: number | null) {
    setBabyAgeNumber(value);
    setTouched((prev) => ({ ...prev, babyAge: true }));
  }

  function handleSelectBabyAgeUnit(value: "weeks" | "months") {
    setBabyAgeUnit(value);
    setTouched((prev) => ({ ...prev, babyAge: true }));
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    const { isValid } = getValidationState();
    if (!isValid) {
      // Mark all fields as touched so inline errors are visible
      setTouched({
        name: true,
        dueDate: true,
        babyAge: true,
      });
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
          due_date:
            status === "pregnant"
              ? formatDateForBackend(dueDateValue)
              : null,
          baby_age:
            status === "new_mom" && babyAgeNumber
              ? `${babyAgeNumber} ${babyAgeUnit === "weeks" ? "weeks" : "months"}`
              : null,
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
          due_date:
            status === "pregnant"
              ? formatDateForBackend(dueDateValue)
              : null,
          baby_age:
            status === "new_mom" && babyAgeNumber
              ? `${babyAgeNumber} ${babyAgeUnit === "weeks" ? "weeks" : "months"}`
              : null,
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
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#B8A99A"
              value={name}
              onChangeText={handleNameChange}
              editable={!loading}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, name: true }))
              }
              returnKeyType="done"
              onSubmitEditing={() => {
                if (isFormValid) {
                  handleSubmit();
                } else {
                  Keyboard.dismiss();
                }
              }}
            />
            <Text
              style={[
                styles.helperText,
                touched.name && nameError ? styles.errorText : null,
              ]}
            >
              {touched.name && nameError ? nameError : " "}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>I am...</Text>
            <View style={styles.pills}>
              <Pressable
                style={[styles.pill, status === "pregnant" && styles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setStatus("pregnant");
                }}
                disabled={loading}
              >
                <Text style={[styles.pillText, status === "pregnant" && styles.pillTextActive]}>
                  Pregnant
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pill, status === "new_mom" && styles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setStatus("new_mom");
                }}
                disabled={loading}
              >
                <Text style={[styles.pillText, status === "new_mom" && styles.pillTextActive]}>
                  New Mom
                </Text>
              </Pressable>
            </View>
          </View>
          {status === "pregnant" && (
            <View style={styles.field}>
              <Text style={styles.label}>Due date</Text>
              <Pressable
                style={styles.input}
                onPress={() => {
                  setShowCalendar((prev) => !prev);
                  setTouched((prev) => ({ ...prev, dueDate: true }));
                }}
                disabled={loading}
              >
                <Text
                  style={
                    dueDateValue
                      ? styles.inputValueText
                      : styles.inputPlaceholderText
                  }
                >
                  {dueDateValue
                    ? formatDateForDisplay(dueDateValue)
                    : "Select due date"}
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.helperText,
                  touched.dueDate && dueDateError ? styles.errorText : null,
                ]}
              >
                {touched.dueDate && dueDateError ? dueDateError : " "}
              </Text>
              {showCalendar && (
                <Calendar
                  onDayPress={(day) => handleDueDateSelect(day.dateString)}
                  markedDates={
                    dueDateValue
                      ? {
                          [formatDateForBackend(dueDateValue) as string]: {
                            selected: true,
                          },
                        }
                      : undefined
                  }
                />
              )}
            </View>
          )}
          {status === "new_mom" && (
            <View style={styles.field}>
              <Text style={styles.label}>Baby's age</Text>
              <View style={styles.babyAgeRow}>
                <View style={styles.babyAgeNumbers}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                    <Pressable
                      key={num}
                      style={[
                        styles.babyAgePill,
                        babyAgeNumber === num && styles.babyAgePillActive,
                      ]}
                      onPress={() => handleSelectBabyAgeNumber(num)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.babyAgePillText,
                          babyAgeNumber === num && styles.babyAgePillTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.babyAgeUnitRow}>
                  <Pressable
                    style={[
                      styles.pill,
                      styles.babyAgeUnitPill,
                      babyAgeUnit === "weeks" && styles.pillActive,
                    ]}
                    onPress={() => handleSelectBabyAgeUnit("weeks")}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        babyAgeUnit === "weeks" && styles.pillTextActive,
                      ]}
                    >
                      weeks
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pill,
                      styles.babyAgeUnitPill,
                      babyAgeUnit === "months" && styles.pillActive,
                    ]}
                    onPress={() => handleSelectBabyAgeUnit("months")}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        babyAgeUnit === "months" && styles.pillTextActive,
                      ]}
                    >
                      months
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text
                style={[
                  styles.helperText,
                  touched.babyAge && babyAgeError ? styles.errorText : null,
                ]}
              >
                {touched.babyAge && babyAgeError ? babyAgeError : " "}
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
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
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingVertical: 24, paddingBottom: 48 },
  header: { marginBottom: 24, alignItems: "center" },
  logo: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600", color: colors.textPrimary },
  subtitle: { fontSize: 17, color: colors.textSecondary, marginTop: 8 },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  inputPlaceholderText: {
    fontSize: 16,
    color: "#B8A99A",
  },
  inputValueText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  row: { marginBottom: 16 },
  label: { fontSize: 16, color: colors.textPrimary, marginBottom: 8 },
  pills: { flexDirection: "row", gap: 12 },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#FFF",
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
  pillTextActive: { color: "#FFF" },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.85 },
  primaryButtonText: { fontSize: 17, fontWeight: "600", color: "#FFF" },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    minHeight: 16, // Reserve space to avoid layout jumps
  },
  errorText: {
    color: colors.error,
  },
  babyAgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  babyAgeNumbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    gap: 8,
  },
  babyAgePill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },
  babyAgePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  babyAgePillText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  babyAgePillTextActive: {
    color: "#FFF",
  },
  babyAgeUnitRow: {
    marginLeft: 12,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 8,
  },
  babyAgeUnitPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
