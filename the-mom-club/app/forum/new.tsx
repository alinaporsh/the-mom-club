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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth, useCanPost } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";

async function createPost(args: { authorId: string; title: string; body: string }) {
  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: args.authorId,
      title: args.title.trim(),
      body: args.body.trim(),
    })
    .select("id")
    .single();
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

  function handleSubmit() {
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
    createMutation.mutate({
      authorId: state.session.user.id,
      title,
      body,
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
  textArea: { 
    minHeight: 160,
    paddingTop: 16,
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
