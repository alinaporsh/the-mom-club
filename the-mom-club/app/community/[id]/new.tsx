import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCommunityForum } from "../../../contexts/CommunityForumContext";
import { useAuth, useCanPost } from "../../../contexts/AuthContext";
import { colors } from "../../theme";

export default function NewCommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = typeof id === "string" ? id : "";
  const router = useRouter();
  const { getCommunityById, addPost } = useCommunityForum();
  const { state } = useAuth();
  const canPost = useCanPost();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const community = communityId ? getCommunityById(communityId) : undefined;

  if (!community) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.message}>Community not found.</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!canPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.message}>
            Sign in to start a new thread in this community.
          </Text>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to attach an image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Image pick failed", error);
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      Alert.alert("Title required", "Please enter a title for your post.");
      return;
    }
    if (!trimmedBody) {
      Alert.alert("Content required", "Please add some details to your post.");
      return;
    }

    if (!canPost) {
      Alert.alert("Sign in required", "You must be signed in to post.");
      return;
    }

    const authorName =
      state.profile?.name ||
      state.session?.user?.email?.split("@")[0] ||
      "You";

    setSubmitting(true);
    try {
      const newId = addPost(
        community.id,
        trimmedTitle,
        trimmedBody,
        authorName,
        imageUri || undefined
      );

      if (!newId) {
        setSubmitting(false);
        return;
      }

      router.replace(`/community/post/${newId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && styles.headerBackButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          New post in {community.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Give your thread a short title"
                placeholderTextColor="#B8A99A"
                value={title}
                onChangeText={setTitle}
                editable={!submitting}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What's on your mind?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your question, story, or tip..."
                placeholderTextColor="#B8A99A"
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.attachmentHeader}>
                <Text style={styles.label}>Photo (optional)</Text>
                {imageUri && (
                  <Pressable
                    onPress={() => setImageUri(null)}
                    style={({ pressed }) => [
                      styles.clearImageButton,
                      pressed && styles.clearImageButtonPressed,
                    ]}
                    disabled={submitting}
                  >
                    <Text style={styles.clearImageText}>Remove</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.attachmentButton,
                  pressed && styles.attachmentButtonPressed,
                ]}
                onPress={handlePickImage}
                disabled={submitting}
              >
                <Ionicons name="image-outline" size={18} color={colors.primary} />
                <Text style={styles.attachmentButtonText}>
                  {imageUri ? "Change photo" : "Add a photo"}
                </Text>
              </Pressable>
              {imageUri && (
                <View style={styles.previewWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || submitting) && styles.submitButtonPressed,
              ]}
              onPress={handleSubmit}
              disabled={
                submitting || !title.trim() || !body.trim()
              }
            >
              <Text style={styles.submitButtonText}>Post</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D5",
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerBackButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  textArea: {
    minHeight: 140,
  },
  attachmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    backgroundColor: "#FFFDF9",
  },
  attachmentButtonPressed: {
    opacity: 0.9,
  },
  attachmentButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  previewWrapper: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  clearImageButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F5F0EB",
  },
  clearImageButtonPressed: {
    opacity: 0.8,
  },
  clearImageText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});

