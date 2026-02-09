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
  const [saving, setSaving] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/auth");
  }

  function openEditModal() {
    // Pre-populate with current values
    setEditName(state.profile?.name || "");
    setEditStatus(state.profile?.status || "pregnant");
    setEditDueDate(""); // We'll load this from profile if needed
    setEditBabyAge(""); // We'll load this from profile if needed
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
      } else if (editStatus === "new_mom" && editBabyAge.trim()) {
        updateData.baby_age = editBabyAge.trim();
        updateData.due_date = null;
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
            onPress={openPaymentModal}
          >
            <Text style={styles.buttonText}>Upgrade to member — 80 QAR</Text>
          </Pressable>
        )}
        {!isGuest && (
          <>
            <Pressable
              style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}
              onPress={openEditModal}
            >
              <Ionicons name="create-outline" size={18} color="#8B7355" style={{ marginRight: 8 }} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </>
        )}
        {isGuest && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => router.replace("/auth")}
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
                  <Ionicons name="close" size={28} color="#5C4A4A" />
                </Pressable>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#B8A99A"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!saving}
                />
              </View>

              {/* Status */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusRow}>
                  <Pressable
                    style={[styles.statusPill, editStatus === "pregnant" && styles.statusPillActive]}
                    onPress={() => setEditStatus("pregnant")}
                    disabled={saving}
                  >
                    <Text style={[styles.statusPillText, editStatus === "pregnant" && styles.statusPillTextActive]}>
                      Pregnant
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.statusPill, editStatus === "new_mom" && styles.statusPillActive]}
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
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD (e.g. 2025-12-19)"
                    placeholderTextColor="#B8A99A"
                    value={editDueDate}
                    onChangeText={setEditDueDate}
                    editable={!saving}
                  />
                </View>
              )}

              {/* Baby Age (if new mom) */}
              {editStatus === "new_mom" && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Baby's Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 3 months"
                    placeholderTextColor="#B8A99A"
                    value={editBabyAge}
                    onChangeText={setEditBabyAge}
                    editable={!saving}
                  />
                </View>
              )}

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
  container: { flex: 1, backgroundColor: "#fff7f2" },
  header: { padding: 24, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: "600", color: "#5C4A4A" },
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
  value: { fontSize: 18, color: "#5C4A4A", fontWeight: "500" },
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
  upgrade: { fontSize: 14, color: "#8B7355", marginTop: 6, fontStyle: "italic" },
  
  upgradeButton: {
    backgroundColor: "#A8C6B6",
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
    backgroundColor: "#A8C6B6",
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
    borderColor: "#E8E0D5",
    marginBottom: 12,
  },
  editButtonText: { fontSize: 16, fontWeight: "600", color: "#8B7355" },
  signOutButton: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  signOutButtonText: { fontSize: 16, fontWeight: "600", color: "#8B7355" },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: "#fff7f2" },
  modalKeyboard: { flex: 1 },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#5C4A4A" },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  planName: { fontSize: 18, fontWeight: "600", color: "#5C4A4A" },
  planPrice: { fontSize: 28, fontWeight: "700", color: "#8B7355", marginTop: 4 },
  planDesc: { fontSize: 14, color: "#8B7355", marginTop: 8, lineHeight: 20 },
  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 14, color: "#5C4A4A", marginBottom: 8, fontWeight: "500", marginLeft: 4 },
  formRow: { flexDirection: "row" },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#5C4A4A",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  cardInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 8 },
  cardInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#5C4A4A",
  },
  payButton: {
    marginTop: 24,
    backgroundColor: "#A8C6B6",
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#A8C6B6",
    backgroundColor: "#FFF",
  },
  statusPillActive: {
    backgroundColor: "#A8C6B6",
    borderColor: "#A8C6B6",
  },
  statusPillText: {
    fontSize: 15,
    color: "#8B7355",
    fontWeight: "500",
  },
  statusPillTextActive: {
    color: "#FFF",
  },
});
