import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

type PaymentModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  summaryTitle: string;
  summaryPrice: string;
  summaryDescription?: string;
  primaryButtonLabel: string;
  onConfirm: () => Promise<void> | void;
};

// Format card number with spaces (1234 5678 9012 3456)
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

// Format expiry as MM/YY
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export default function PaymentModal({
  visible,
  onClose,
  title,
  summaryTitle,
  summaryPrice,
  summaryDescription,
  primaryButtonLabel,
  onConfirm,
}: PaymentModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [processing, setProcessing] = useState(false);

  function handleRequestClose() {
    if (!processing) {
      onClose();
    }
  }

  async function handlePay() {
    // Basic validation
    const cardDigits = cardNumber.replace(/\s/g, "");
    if (cardDigits.length < 13) {
      Alert.alert("Invalid card", "Please enter a valid card number.");
      return;
    }
    if (expiry.length < 5) {
      Alert.alert("Invalid expiry", "Please enter expiry as MM/YY.");
      return;
    }
    if (cvv.length < 3) {
      Alert.alert("Invalid CVV", "Please enter a valid CVV.");
      return;
    }
    if (!cardholderName.trim()) {
      Alert.alert("Name required", "Please enter the cardholder name.");
      return;
    }

    setProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await onConfirm();
      setProcessing(false);
      onClose();
    } catch (err: any) {
      const message = err?.message || "An error occurred during payment processing.";
      Alert.alert("Payment failed", message);
      setProcessing(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleRequestClose}
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
              <Pressable onPress={handleRequestClose} disabled={processing}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.modalTitle}>{title}</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Plan / item summary */}
            <View style={styles.planCard}>
              <Text style={styles.planName}>{summaryTitle}</Text>
              <Text style={styles.planPrice}>{summaryPrice}</Text>
              {summaryDescription ? (
                <Text style={styles.planDesc}>{summaryDescription}</Text>
              ) : null}
            </View>

            {/* Card form */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Card number</Text>
              <View style={styles.cardInputRow}>
                <Ionicons name="card-outline" size={20} color="#B8A99A" style={styles.inputIcon} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#B8A99A"
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  keyboardType="number-pad"
                  maxLength={19}
                  editable={!processing}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formSection, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.formLabel}>Expiry</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  placeholderTextColor="#B8A99A"
                  value={expiry}
                  onChangeText={(v) => setExpiry(formatExpiry(v))}
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={!processing}
                />
              </View>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Text style={styles.formLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#B8A99A"
                  value={cvv}
                  onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  editable={!processing}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Cardholder name</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor="#B8A99A"
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
                editable={!processing}
              />
            </View>

            {/* Pay button */}
            <Pressable
              style={({ pressed }) => [
                styles.payButton,
                (pressed || processing) && styles.payButtonPressed,
              ]}
              onPress={handlePay}
              disabled={processing}
            >
              {processing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.payButtonText}>  Processing...</Text>
                </View>
              ) : (
                <Text style={styles.payButtonText}>{primaryButtonLabel}</Text>
              )}
            </Pressable>

            <Text style={styles.disclaimer}>
              This is a demo. No real payment will be processed.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  formSection: { marginBottom: 16 },
  formLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: "500",
    marginLeft: 4,
  },
  formRow: { flexDirection: "row" },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "#E8E0D5",
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
});

