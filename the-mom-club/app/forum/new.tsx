import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth, useCanPost } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";
import { POST_TAGS } from "./tags";

async function createPost(args: {
  authorId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  tag?: string | null;
}) {
  const tag = args.tag?.trim() || "General";
  const payload: Record<string, unknown> = {
    author_id: args.authorId,
    title: args.title.trim(),
    body: args.body.trim(),
    image_url: args.imageUrl || null,
    tag,
  };

  const { data, error } = await supabase
    .from("forum_posts")
    .insert(payload)
    .select("id")
    .single();

  if (error && (error as any).code === "42703") {
    delete payload.image_url;
    delete payload.tag;
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("forum_posts")
      .insert(payload)
      .select("id")
      .single();
    if (fallbackError) throw fallbackError;
    return fallbackData;
  }
  if (error) throw error;
  return data;
}

export default function NewPostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const canPost = useCanPost();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>("General");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSelectingImage, setIsSelectingImage] = useState(false);

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forumPosts });
      router.replace(`/forum/${data?.id ?? ""}`);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  async function handlePickImage() {
    try {
      setIsSelectingImage(true);

      // Request permissions gracefully
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera roll permission is required to add images. You can still post without an image.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      // Silent fallback - don't block posting
      console.warn("Image selection failed:", error);
      Alert.alert(
        "Image selection failed",
        "Unable to select image. You can still post without an image.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSelectingImage(false);
    }
  }

  function handleRemoveImage() {
    setSelectedImageUri(null);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title.");
      return;
    }
    if (!body.trim()) {
      Alert.alert("Content required", "Please enter your post content.");
      return;
    }
    if (!state.session?.user?.id || !canPost) {
      Alert.alert("Sign in required", "You must be signed in to post.");
      return;
    }

    // MVP: Use local URI as mock image URL
    // In production, this would upload to Supabase Storage first
    createMutation.mutate({
      authorId: state.session.user.id,
      title,
      body,
      imageUrl: selectedImageUri || null,
      tag: tag || "General",
    });
  }

  const loading = createMutation.isPending;

  if (!canPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.message}>Sign in to post.</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#5C4A4A" />
        </Pressable>
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Give your post a title"
                placeholderTextColor="#B8A99A"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                autoFocus={false}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.tagRow}>
                {POST_TAGS.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.tagPill, tag === t && styles.tagPillActive]}
                    onPress={() => setTag(t)}
                  >
                    <Text style={[styles.tagPillText, tag === t && styles.tagPillTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>What's on your mind?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your thoughts with the community..."
                placeholderTextColor="#B8A99A"
                value={body}
                onChangeText={setBody}
                multiline
                editable={!loading}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Image (optional)</Text>
              
              {selectedImageUri ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                    onError={(error) => {
                      console.warn("Failed to load image preview:", error);
                      Alert.alert(
                        "Preview failed",
                        "Unable to preview this image, but you can still post it.",
                        [{ text: "OK" }]
                      );
                    }}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeImageButton,
                      pressed && styles.removeImageButtonPressed,
                    ]}
                    onPress={handleRemoveImage}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={32} color="#FFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.addImageButton,
                    pressed && styles.addImageButtonPressed,
                    (loading || isSelectingImage) && styles.addImageButtonDisabled,
                  ]}
                  onPress={handlePickImage}
                  disabled={loading || isSelectingImage}
                >
                  {isSelectingImage ? (
                    <ActivityIndicator color="#8B7355" size="small" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={28} color="#8B7355" />
                      <Text style={styles.addImageButtonText}>Add image from gallery</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
              onPress={handleSubmit}
              disabled={loading || !title.trim() || !body.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Post</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#fff7f2",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D5",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  backButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5C4A4A",
  },
  headerSpacer: {
    width: 40,
  },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 20,
    paddingTop: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5C4A4A",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#5C4A4A",
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#8EC3C6",
    backgroundColor: "#FFF",
  },
  tagPillActive: {
    backgroundColor: "#8EC3C6",
    borderColor: "#8EC3C6",
  },
  tagPillText: {
    fontSize: 14,
    color: "#8B7355",
    fontWeight: "500",
  },
  tagPillTextActive: {
    color: "#FFF",
  },
  textArea: {
    minHeight: 160,
    paddingTop: 16,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: "#E8E0D5",
    borderStyle: "dashed",
  },
  addImageButtonPressed: {
    opacity: 0.7,
    backgroundColor: "#F5F0EB",
  },
  addImageButtonDisabled: {
    opacity: 0.5,
  },
  addImageButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8B7355",
  },
  imagePreviewWrapper: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  imagePreview: {
    width: "100%",
    height: 220,
    backgroundColor: "#E8E0D5",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
  },
  removeImageButtonPressed: {
    opacity: 0.8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#A8C6B6",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#FFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  message: { fontSize: 16, color: "#8B7355", textAlign: "center", marginBottom: 20 },
});
