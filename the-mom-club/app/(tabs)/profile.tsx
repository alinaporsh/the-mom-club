import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Calendar } from "react-native-calendars";
import { colors } from "../theme";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import PaymentModal from "../components/PaymentModal";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state, refreshProfileAndRole } = useAuth();

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Edit profile modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"pregnant" | "new_mom">("pregnant");
  const [editDueDate, setEditDueDate] = useState("");
  const [editBabyAge, setEditBabyAge] = useState("");
  const [babyAgeNumber, setBabyAgeNumber] = useState<number | null>(null);
  const [babyAgeUnit, setBabyAgeUnit] = useState<"weeks" | "months">("months");
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/auth");
  }

  function openEditModal() {
    // Pre-populate with current values
    setEditName(state.profile?.name || "");
    setEditStatus(state.profile?.status || "pregnant");
    setEditDueDate(state.profile?.due_date ?? "");
    const currentBabyAge = state.profile?.baby_age ?? "";
    setEditBabyAge(currentBabyAge);

    // Try to parse "3 months" / "2 weeks" style values from onboarding
    const match = currentBabyAge.match(/(\d+)\s+(week|weeks|month|months)/i);
    if (match) {
      const parsedNumber = parseInt(match[1], 10);
      const parsedUnit = match[2].toLowerCase().startsWith("week")
        ? "weeks"
        : "months";
      setBabyAgeNumber(Number.isNaN(parsedNumber) ? null : parsedNumber);
      setBabyAgeUnit(parsedUnit);
    } else {
      setBabyAgeNumber(null);
      setBabyAgeUnit("months");
    }
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (!saving) {
      setShowEditModal(false);
    }
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    if (!state.session?.user?.id) return;

    setSaving(true);
    try {
      const updateData: any = {
        name: editName.trim(),
        status: editStatus,
        updated_at: new Date().toISOString(),
      };

      if (editStatus === "pregnant" && editDueDate.trim()) {
        updateData.due_date = editDueDate.trim();
        updateData.baby_age = null;
      } else if (editStatus === "new_mom") {
        if (babyAgeNumber) {
          updateData.baby_age = `${babyAgeNumber} ${babyAgeUnit}`;
          updateData.due_date = null;
        } else if (editBabyAge.trim()) {
          // Fallback for any legacy free‑text values
          updateData.baby_age = editBabyAge.trim();
          updateData.due_date = null;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", state.session.user.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      await refreshProfileAndRole();
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setSaving(false);
    }
  }

  function openPaymentModal() {
    setShowPaymentModal(true);
  }

  function closePaymentModal() {
    setShowPaymentModal(false);
  }

  async function handleMembershipPayment() {
    if (!state.session?.user?.id) {
      throw new Error("You must be signed in to complete payment.");
    }

    try {
      // Use upsert instead of update to handle cases where membership might not exist
      // This is safer and will work whether the membership exists or not
      const { data, error } = await supabase
        .from("memberships")
        .upsert(
          { 
            user_id: state.session.user.id, 
            role: "member", 
            updated_at: new Date().toISOString() 
          },
          { onConflict: "user_id" }
        )
        .select();

      if (error) {
        // Show more detailed error message for debugging
        const errorMessage = error.message || error.code || "Unknown error occurred";
        console.error("Membership update error:", error);
        throw new Error(`Unable to process payment: ${errorMessage}`);
      }

      // Verify the upsert was successful
      if (!data || data.length === 0) {
        throw new Error("Unable to update membership. Please try again.");
      }

      // Add a small delay to ensure database change is committed and visible
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Refresh profile and role to get the updated membership status
      await refreshProfileAndRole();

      // Verify the role was updated correctly
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: membershipCheck } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", currentUser.id)
          .single();
        
        if (membershipCheck?.role !== "member") {
          // If role still not updated, refresh again after a short delay
          await new Promise((resolve) => setTimeout(resolve, 300));
          await refreshProfileAndRole();
        }
      }

      Alert.alert(
        "Payment successful!",
        "Welcome to The Mom Club membership. You can now book events and classes."
      );
    } catch (err: any) {
      // Re-throw so the shared PaymentModal can surface the error
      throw new Error(err?.message || "An error occurred during payment processing.");
    }
  }

  const isGuest = state.isGuest;
  const role = state.role ?? "guest";
  const email = state.session?.user?.email ?? (isGuest ? "Guest" : "—");
  const showUpgradeButton = !isGuest && role === "free";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.label}>Membership</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.value}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
              {role === "admin" && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            {(role === "guest" || role === "free") && (
              <Text style={styles.upgrade}>Upgrade to member to book events.</Text>
            )}
          </View>
        </View>

        {showUpgradeButton && (
          <Pressable
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.buttonPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              openPaymentModal();
            }}
          >
            <Text style={styles.buttonText}>Upgrade to member — 80 QAR</Text>
          </Pressable>
        )}
        {!isGuest && (
          <>
            <Pressable
              style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                openEditModal();
              }}
            >
              <Ionicons name="create-outline" size={18} color="#8B7355" style={{ marginRight: 8 }} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                handleSignOut();
              }}
            >
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </>
        )}
        {isGuest && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.replace("/auth");
            }}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </Pressable>
        )}
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={closePaymentModal}
        title="Membership checkout"
        summaryTitle="Mom Club Membership"
        summaryPrice="80 QAR"
        summaryDescription="Book unlimited classes, events, and get access to exclusive content."
        primaryButtonLabel="Pay 80 QAR"
        onConfirm={handleMembershipPayment}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboard}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Pressable onPress={closeEditModal} disabled={saving}>
                  <Ionicons name="close" size={28} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={[styles.input, focusedField === "name" && styles.inputFocused]}
                  placeholder="Your name"
                  placeholderTextColor="#B8A99A"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!saving}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Status */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.statusPill,
                      editStatus === "pregnant" && styles.statusPillActive,
                      pressed && styles.statusPillPressed,
                    ]}
                    onPress={() => setEditStatus("pregnant")}
                    disabled={saving}
                  >
                    <Text style={[styles.statusPillText, editStatus === "pregnant" && styles.statusPillTextActive]}>
                      Pregnant
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.statusPill,
                      editStatus === "new_mom" && styles.statusPillActive,
                      pressed && styles.statusPillPressed,
                    ]}
                    onPress={() => setEditStatus("new_mom")}
                    disabled={saving}
                  >
                    <Text style={[styles.statusPillText, editStatus === "new_mom" && styles.statusPillTextActive]}>
                      New Mom
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Due Date (if pregnant) */}
              {editStatus === "pregnant" && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Due Date</Text>
                  <Pressable
                    style={[
                      styles.input,
                      styles.dateInput,
                      showDueDatePicker && styles.inputFocused,
                    ]}
                    onPress={() => {
                      if (!saving) {
                        setShowDueDatePicker(true);
                      }
                    }}
                    disabled={saving}
                  >
                    <Text
                      style={
                        editDueDate
                          ? styles.inputValueText
                          : styles.inputPlaceholderText
                      }
                    >
                      {editDueDate || "YYYY-MM-DD (e.g. 2025-12-19)"}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              )}

              {/* Baby Age (if new mom) */}
              {editStatus === "new_mom" && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Baby's Age</Text>
                  <View style={styles.babyAgeRow}>
                    <View style={styles.babyAgeNumbers}>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                        <Pressable
                          key={num}
                          style={[
                            styles.babyAgePill,
                            babyAgeNumber === num && styles.babyAgePillActive,
                          ]}
                          onPress={() => {
                            setBabyAgeNumber(num);
                            setEditBabyAge(`${num} ${babyAgeUnit}`);
                          }}
                          disabled={saving}
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
                          styles.statusPill,
                          styles.babyAgeUnitPill,
                          babyAgeUnit === "weeks" && styles.statusPillActive,
                        ]}
                        onPress={() => {
                          setBabyAgeUnit("weeks");
                          if (babyAgeNumber) {
                            setEditBabyAge(`${babyAgeNumber} weeks`);
                          }
                        }}
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            babyAgeUnit === "weeks" && styles.statusPillTextActive,
                          ]}
                        >
                          weeks
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.statusPill,
                          styles.babyAgeUnitPill,
                          babyAgeUnit === "months" && styles.statusPillActive,
                        ]}
                        onPress={() => {
                          setBabyAgeUnit("months");
                          if (babyAgeNumber) {
                            setEditBabyAge(`${babyAgeNumber} months`);
                          }
                        }}
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            babyAgeUnit === "months" && styles.statusPillTextActive,
                          ]}
                        >
                          months
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Due date picker */}
              <Modal
                visible={showDueDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDueDatePicker(false)}
              >
                <View style={styles.datePickerOverlay}>
                  <View style={styles.datePickerCard}>
                    <Text style={styles.datePickerTitle}>Select due date</Text>
                    <Calendar
                      onDayPress={(day) => {
                        setEditDueDate(day.dateString);
                        setShowDueDatePicker(false);
                      }}
                      markedDates={
                        editDueDate
                          ? {
                              [editDueDate]: {
                                selected: true,
                                selectedColor: colors.primary,
                              },
                            }
                          : undefined
                      }
                      theme={{
                        selectedDayBackgroundColor: colors.primary,
                        todayTextColor: colors.primary,
                        arrowColor: colors.primary,
                        textSectionTitleColor: colors.textSecondary,
                      }}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.datePickerCloseButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => setShowDueDatePicker(false)}
                    >
                      <Text style={styles.datePickerCloseButtonText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>

              {/* Save button */}
              <Pressable
                style={({ pressed }) => [
                  styles.payButton,
                  (pressed || saving) && styles.payButtonPressed,
                ]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.processingRow}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.payButtonText}>  Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.payButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: "600", color: colors.textPrimary },
  content: { padding: 24 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  section: { marginVertical: 8 },
  divider: { height: 1, backgroundColor: "#F0EAE0", marginVertical: 12 },
  label: { fontSize: 14, color: "#B8A99A", marginBottom: 6 },
  roleContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  value: { fontSize: 18, color: colors.textPrimary, fontWeight: "500" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#5C4A4A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: { fontSize: 12, fontWeight: "600", color: "#FFF" },
  upgrade: { fontSize: 14, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  editButton: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 12,
  },
  editButtonText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  signOutButton: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  signOutButtonText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalKeyboard: { flex: 1 },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  planName: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  planPrice: { fontSize: 28, fontWeight: "700", color: colors.textSecondary, marginTop: 4 },
  planDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  formSection: { marginBottom: 20 },
  formLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
    marginLeft: 4,
  },
  formRow: { flexDirection: "row" },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputPlaceholderText: {
    fontSize: 16,
    color: "#B8A99A",
  },
  inputValueText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  cardInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 8 },
  cardInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  payButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonPressed: { opacity: 0.85 },
  payButtonText: { fontSize: 17, fontWeight: "600", color: "#FFF" },
  processingRow: { flexDirection: "row", alignItems: "center" },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    color: "#B8A99A",
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statusPillTextActive: {
    color: "#FFF",
  },
  statusPillPressed: {
    opacity: 0.9,
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
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 24,
  },
  datePickerCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  datePickerCloseButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  datePickerCloseButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
