import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth, useCanPost, useIsAdmin } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";
import { TagPill } from "../components/TagPill";
import { inferTagsForPost } from "./tags";

type Post = { id: string; title: string; body: string; created_at: string };
type Comment = { id: string; body: string; created_at: string };

async function fetchPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("id, title, body, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("forum_comments")
    .select("id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

async function createComment(args: { postId: string; authorId: string; body: string }) {
  const { error } = await supabase.from("forum_comments").insert({
    post_id: args.postId,
    author_id: args.authorId,
    body: args.body.trim(),
  });
  if (error) throw error;
}

async function deletePost(postId: string) {
  const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
  if (error) throw error;
}

async function deleteComment(commentId: string) {
  const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export default function ForumPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = id ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const canPost = useCanPost();
  const isAdmin = useIsAdmin();
  const [commentBody, setCommentBody] = useState("");

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: queryKeys.forumPost(postId),
    queryFn: () => fetchPost(postId),
    enabled: !!postId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: queryKeys.forumComments(postId),
    queryFn: () => fetchComments(postId),
    enabled: !!postId,
  });

  const commentMutation = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forumComments(postId) });
      setCommentBody("");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      Alert.alert("Deleted", "Post deleted successfully.");
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forumComments(postId) });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  function handleAddComment() {
    if (!commentBody.trim()) {
      Alert.alert("Comment required", "Please enter a comment.");
      return;
    }
    if (!state.session?.user?.id || !canPost) {
      Alert.alert("Sign in required", "You must be signed in to comment.");
      return;
    }
    commentMutation.mutate({
      postId,
      authorId: state.session.user.id,
      body: commentBody,
    });
  }

  function handleDeletePost() {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePostMutation.mutate(postId),
        },
      ]
    );
  }

  function handleDeleteComment(commentId: string) {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCommentMutation.mutate(commentId),
        },
      ]
    );
  }

  const loading = postLoading || (!!postId && !post);

  if (!postId || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Post not found.</Text>
      </View>
    );
  }

  const postTags = inferTagsForPost(post.title, post.body).slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#5C4A4A" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
            {postTags.length > 0 && (
              <View style={styles.tagRow}>
                {postTags.map((tag) => (
                  <TagPill key={tag} label={tag} />
                ))}
              </View>
            )}
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={12} color="#B8A99A" />
              <Text style={styles.date}>
                {new Date(post.created_at).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
          {isAdmin && (
            <Pressable
              onPress={handleDeletePost}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            >
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </Pressable>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.postContent}>
            <Text style={styles.body}>{post.body}</Text>
          </View>
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentContent}>
                  <View style={styles.commentTextContainer}>
                    <Text style={styles.commentBody}>{c.body}</Text>
                    <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</Text>
                  </View>
                  {isAdmin && (
                    <Pressable
                      onPress={() => handleDeleteComment(c.id)}
                      style={({ pressed }) => [styles.deleteCommentButton, pressed && styles.deleteButtonPressed]}
                    >
                      <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            {!canPost && (
              <View style={styles.signUpPrompt}>
                <Text style={styles.signUpPromptText}>
                  Sign up for free to join the conversation and post comments.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.signUpButton, pressed && styles.signUpButtonPressed]}
                  onPress={() => router.push("/auth")}
                >
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                </Pressable>
              </View>
            )}
            {canPost && (
              <View style={styles.addComment}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#B8A99A"
                  value={commentBody}
                  onChangeText={setCommentBody}
                  multiline
                  editable={!commentMutation.isPending}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.commentSubmit,
                    (pressed || commentMutation.isPending) && styles.commentSubmitPressed,
                  ]}
                  onPress={handleAddComment}
                  disabled={commentMutation.isPending || !commentBody.trim()}
                >
                  {commentMutation.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.commentSubmitText}>Post comment</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1, 
    borderBottomColor: "#E8E0D5",
    backgroundColor: "#fff7f2",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  headerContent: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start",
    marginTop: 4,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#5C4A4A",
    lineHeight: 32,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  date: { 
    fontSize: 13, 
    color: "#B8A99A",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFF0ED",
  },
  deleteButtonPressed: { opacity: 0.6 },
  scroll: { padding: 20, paddingBottom: 32 },
  postContent: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  body: { 
    fontSize: 16, 
    color: "#5C4A4A", 
    lineHeight: 26,
  },
  commentsSection: { marginTop: 8 },
  commentsTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#5C4A4A", 
    marginBottom: 16,
  },
  comment: { 
    backgroundColor: "#FFFDF9", 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  commentTextContainer: { flex: 1, marginRight: 8 },
  commentBody: { fontSize: 15, color: "#5C4A4A" },
  commentDate: { fontSize: 12, color: "#B8A99A", marginTop: 4 },
  deleteCommentButton: {
    padding: 4,
    borderRadius: 6,
  },
  keyboard: { flex: 1 },
  signUpPrompt: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#FFFDF9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    alignItems: "center",
  },
  signUpPromptText: {
    fontSize: 14,
    color: "#8B7355",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  signUpButton: {
    backgroundColor: "#C4A77D",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  signUpButtonPressed: { opacity: 0.85 },
  signUpButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  addComment: { marginTop: 12 },
  commentInput: {
    backgroundColor: "#FFFDF9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#5C4A4A",
    borderWidth: 1,
    borderColor: "#E8E0D5",
    minHeight: 80,
    textAlignVertical: "top",
  },
  commentSubmit: {
    marginTop: 8,
    backgroundColor: "#C4A77D",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  commentSubmitPressed: { opacity: 0.85 },
  commentSubmitText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  empty: { fontSize: 16, color: "#8B7355" },
});
