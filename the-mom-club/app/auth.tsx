import { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import { colors } from "./theme";

const isSupabaseConfigured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type AuthStep = "email" | "verify";

export default function AuthScreen() {
  const router = useRouter();
  const { setGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState<"signup" | "signin" | "verify" | null>(null);
  const [step, setStep] = useState<AuthStep>("email");
  const [isNewUser, setIsNewUser] = useState(false);

  async function handleSendCode(shouldCreateUser: boolean) {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert(
        "Setup required",
        "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment."
      );
      return;
    }

    setLoading(shouldCreateUser ? "signup" : "signin");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Before sending an OTP, check if the email already exists.
      // If the user taps "Sign Up" with an existing email, show a warning instead of sending an OTP.
      // If the user taps "Sign In" with a non-existing email, guide them to use Sign Up.
      try {
        const { data: emailExists, error: emailCheckError } = await supabase.rpc("email_exists", {
          p_email: normalizedEmail,
        });

        if (emailCheckError) {
          // Log the error but continue with normal flow
          console.warn("Email exists check failed:", emailCheckError.message, emailCheckError);
          console.warn("This may indicate the email_exists function is not deployed or lacks permissions.");
        } else {
          // Log successful check for debugging
          console.log(`Email exists check: ${normalizedEmail} -> ${emailExists}`);
        }

        if (!emailCheckError && typeof emailExists === "boolean") {
          if (emailExists && shouldCreateUser) {
            setLoading(null);
            Alert.alert(
              "Account exists",
              "An account with this email already exists. Please use 'Sign In' instead."
            );
            return;
          }

          if (!emailExists && !shouldCreateUser) {
            setLoading(null);
            Alert.alert(
              "No account found",
              "We couldn't find an account with this email. Please use 'Sign Up' to create an account."
            );
            return;
          }
        }
      } catch (error) {
        // If the email check fails for any reason, log it and fall back to the normal Supabase flow.
        console.warn("Email exists check exception:", error);
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser },
      });
      
      setLoading(null);
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          if (shouldCreateUser) {
            Alert.alert(
              "Account exists",
              "An account with this email already exists. Please use 'Sign In' instead."
            );
            return;
          }
        }
        // Handle database errors during signup
        if (shouldCreateUser && (error.message.includes("Database error") || error.message.includes("saving new user") || error.message.includes("constraint") || error.message.includes("violates"))) {
          Alert.alert(
            "Sign up failed",
            "There was an error creating your account. Please try again or contact support if the problem persists."
          );
          return;
        }
        Alert.alert(shouldCreateUser ? "Sign up failed" : "Sign in failed", error.message);
        return;
      }
      
      setIsNewUser(shouldCreateUser);
      setStep("verify");
    } catch (err: any) {
      setLoading(null);
      Alert.alert(
        shouldCreateUser ? "Sign up failed" : "Sign in failed",
        err?.message || "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleVerifyCode() {
    if (!otp.trim()) {
      Alert.alert("Code required", "Please enter the verification code from your email.");
      return;
    }
    setLoading("verify");
    
    try {
      // Try verification with the expected type first
      // For new users (signup), use type: "signup"
      // For existing users (signin), use type: "email"
      let otpType: "signup" | "email" | "magiclink" = isNewUser ? "signup" : "email";
      
      let result = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: otpType,
      });
      
      // If verification fails and we tried signup type, also try email type
      // This handles the case where shouldCreateUser was true but user already existed
      if (result.error && isNewUser && otpType === "signup") {
        const emailResult = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          type: "email",
        });
        
        // If email type works, it means user already existed
        if (!emailResult.error) {
          // User already existed - show warning but allow signin
          Alert.alert(
            "Account already exists",
            "This email is already registered. You have been signed in.",
            [{ text: "OK" }]
          );
          setIsNewUser(false);
          result = emailResult;
        } else {
          result = emailResult;
        }
      }
      
      if (result.error) {
        setLoading(null);
        // Provide more helpful error messages
        if (result.error.message.includes("expired") || result.error.message.includes("invalid")) {
          Alert.alert(
            "Verification failed",
            "The verification code has expired or is invalid. Please request a new code."
          );
        } else {
          Alert.alert("Verification failed", result.error.message);
        }
        return;
      }
      
      // Check if verification returned a session directly
      let session = result.data?.session;
      
      // If no session in response, explicitly wait for session to be established
      if (!session) {
        let sessionRetries = 0;
        const maxRetries = 15; // Increased retries for slower connections
        
        while (sessionRetries < maxRetries && !session) {
          await new Promise(resolve => setTimeout(resolve, 300)); // Wait 300ms between checks
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          if (currentSession) {
            session = currentSession;
            break;
          }
          // If there's an error getting session, it might be a temporary issue
          if (sessionError && sessionRetries > 5) {
            // After a few retries, if still erroring, something is wrong
            break;
          }
          sessionRetries++;
        }
      }
      
      if (!session) {
        setLoading(null);
        Alert.alert(
          "Session error",
          "Verification succeeded but session could not be established. Please try signing in again."
        );
        return;
      }
      
      // For new signups, wait a bit for the profile trigger to complete
      if (isNewUser) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for trigger
      }

      // After session is established, look up the user's profile to see if onboarding is completed.
      // This prevents existing users from going through onboarding again, even if they tapped "Sign Up".
      const userId = session.user.id;
      let profile: { onboarding_completed_at: string | null } | null = null;
      let profileRetries = 0;
      const maxProfileRetries = 5;

      while (profileRetries < maxProfileRetries && !profile) {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", userId)
          .single();

        if (data && !error) {
          profile = data;
          break;
        }

        // If no rows yet (PGRST116) and this is a new signup, wait briefly for trigger/edge to create profile
        if (error?.code === "PGRST116" && isNewUser) {
          await new Promise(resolve => setTimeout(resolve, profileRetries === 0 ? 500 : 200));
        } else {
          // For other errors or existing users, don't loop forever – break and fall back.
          break;
        }

        profileRetries++;
      }

      setLoading(null);

      // Route based on onboarding completion instead of isNewUser alone.
      if (profile && profile.onboarding_completed_at) {
        // Onboarding already completed → go directly to main app
        router.replace("/(tabs)");
      } else {
        // No profile yet or onboarding not completed → go to onboarding
        router.replace("/onboarding");
      }
    } catch (err: any) {
      setLoading(null);
      Alert.alert(
        "Verification failed",
        err?.message || "An unexpected error occurred. Please try again."
      );
    }
  }

  function handleResendCode() {
    handleSendCode(isNewUser);
  }

  function handleBack() {
    setStep("email");
    setOtp("");
  }

  function handleContinueAsGuest() {
    setGuest();
    router.replace("/(tabs)");
  }

  // Email entry step
  if (step === "email") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Logo size="large" style={styles.logo} />
              <Text style={styles.subtitle}>We're the village... and the coffee.</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#B8A99A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || loading === "signup") && styles.primaryButtonPressed,
              ]}
              onPress={() => handleSendCode(true)}
              disabled={!!loading}
            >
              {loading === "signup" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || loading === "signin") && styles.secondaryButtonPressed,
              ]}
              onPress={() => handleSendCode(false)}
              disabled={!!loading}
            >
              {loading === "signin" ? (
                <ActivityIndicator color="#8B7355" size="small" />
              ) : (
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              )}
            </Pressable>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={({ pressed }) => [pressed && styles.textButtonPressed]}
              onPress={handleContinueAsGuest}
              disabled={!!loading}
            >
              <Text style={styles.textButton}>Continue as Guest</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // OTP verification step
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Logo size="medium" style={styles.logo} />
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a code to {email}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="00000000"
            placeholderTextColor="#B8A99A"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={8}
            editable={!loading}
            textAlign="center"
          />
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading === "verify") && styles.primaryButtonPressed,
            ]}
            onPress={handleVerifyCode}
            disabled={!!loading}
          >
            {loading === "verify" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify</Text>
            )}
          </Pressable>
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive a code? </Text>
            <Pressable onPress={handleResendCode} disabled={!!loading}>
              <Text style={styles.resendLink}>Resend</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.textButtonPressed]}
            onPress={handleBack}
            disabled={!!loading}
          >
            <Text style={styles.backButtonText}>← Back to email</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1, justifyContent: "center" },
  content: { paddingHorizontal: 28, paddingVertical: 24 },
  header: { marginBottom: 32, alignItems: "center" },
  logo: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center", lineHeight: 24 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: "600",
  },
  primaryButton: {
    // Primary blue‑teal tone shared across the app
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: colors.primarySoft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    // Warm outline like the mockup "Sign In" button
    borderColor: colors.accentWarm,
    marginBottom: 28,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.97 }],
    // Slightly deeper blue‑teal on press for contrast
    backgroundColor: colors.primaryPressed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButtonPressed: {
    opacity: 0.7,
  },
  primaryButtonText: { fontSize: 17, fontWeight: "600", color: "#FFF" },
  secondaryButtonText: { fontSize: 17, fontWeight: "600", color: colors.accentWarm },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E0D8CC" },
  dividerText: { marginHorizontal: 14, fontSize: 14, color: "#B8A99A" },
  textButton: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  textButtonPressed: { opacity: 0.7 },
  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: 8, marginBottom: 24 },
  resendText: { fontSize: 14, color: colors.textSecondary },
  resendLink: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  backButton: { alignItems: "center", paddingVertical: 12 },
  backButtonText: { fontSize: 15, color: colors.textSecondary },
});
