/**
 * Forum Post Detail Screen
 * 
 * INTENTIONALLY FLAT DESIGN (NO HIERARCHY):
 * - No subforums or subcategories
 * - Comments are ONE LEVEL ONLY (no reply-to-reply)
 * - No threaded replies, no parent_comment_id
 * 
 * This is kept simple for MVP moderation and user experience.
 */
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth, useCanPost, useIsAdmin } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";
import { getPostTag } from "./tags";

// Flat comments only: 1-level. Users comment on posts, not on comments. No reply-to-comment, no nesting.
type Post = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  image_url: string | null;
  author_name: string;
  tag: string | null;
};
type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  image_url: string | null;
};

async function fetchPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("id, title, body, created_at, image_url, tag, author_id, profiles(name)")
    .eq("id", id)
    .single();

  if (error) {
    if ((error as any).code === "42703") {
      const { data: fallback } = await supabase
        .from("forum_posts")
        .select("id, title, body, created_at, image_url, author_id, profiles(name)")
        .eq("id", id)
        .single();
      if (fallback) {
        const profile = (fallback as any).profiles as { name?: string } | null;
        return {
          id: fallback.id,
          title: fallback.title,
          body: fallback.body,
          created_at: fallback.created_at,
          image_url: (fallback as any).image_url ?? null,
          tag: null,
          author_name: profile?.name ?? "Unknown",
        };
      }
    }
    console.error("Error fetching post:", error);
    return null;
  }
  if (!data) return null;

  const profile = (data as any).profiles as { name?: string } | null;
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    created_at: data.created_at,
    image_url: (data as any).image_url ?? null,
    tag: (data as any).tag ?? null,
    author_name: profile?.name ?? "Unknown",
  };
}

async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("forum_comments")
    .select("id, body, created_at, image_url, author_id, profiles(name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    if ((error as any).code === "42703") {
      const { data: fallback } = await supabase
        .from("forum_comments")
        .select("id, body, created_at, author_id, profiles(name)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      return (fallback ?? []).map((c: any) => {
        const profile = c.profiles as { name?: string } | null;
        return {
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          image_url: null,
          author_name: profile?.name ?? "Unknown",
        };
      });
    }
    console.error("Error fetching comments:", error);
    return [];
  }

  return (data ?? []).map((c: any) => {
    const profile = c.profiles as { name?: string } | null;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      image_url: c.image_url ?? null,
      author_name: profile?.name ?? "Unknown",
    };
  });
}

async function createComment(args: {
  postId: string;
  authorId: string;
  body: string;
  imageUrl?: string | null;
}) {
  const payload: Record<string, unknown> = {
    post_id: args.postId,
    author_id: args.authorId,
    body: args.body.trim(),
    image_url: args.imageUrl ?? null,
  };

  const { error } = await supabase.from("forum_comments").insert(payload);

  if (error && (error as any).code === "42703") {
    delete payload.image_url;
    const { error: fallbackError } = await supabase
      .from("forum_comments")
      .insert(payload);
    if (fallbackError) throw fallbackError;
  } else if (error) throw error;
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
  const [selectedCommentImageUri, setSelectedCommentImageUri] = useState<string | null>(null);
  const [isSelectingCommentImage, setIsSelectingCommentImage] = useState(false);

  // MOCK: Local vote state (not persisted)
  const [voteScore, setVoteScore] = useState(0);
  const [userVote, setUserVote] = useState<number | null>(null);

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
      setSelectedCommentImageUri(null);
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

  async function handlePickCommentImage() {
    try {
      setIsSelectingCommentImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera roll permission is required. You can still comment without an image.",
          [{ text: "OK" }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedCommentImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Comment image selection failed:", error);
      Alert.alert(
        "Image selection failed",
        "Unable to select image. You can still comment without an image.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSelectingCommentImage(false);
    }
  }

  function handleAddComment() {
    if (!commentBody.trim()) {
      Alert.alert("Comment required", "Please enter a comment.");
      return;
    }
    if (!state.session?.user?.id || !canPost) {
      Alert.alert("Sign in required", "You must be signed in to comment.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    commentMutation.mutate({
      postId,
      authorId: state.session.user.id,
      body: commentBody,
      imageUrl: selectedCommentImageUri || null,
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

  // MOCK: Handle vote (local state only)
  const handleVote = (vote: 1 | -1) => {
    if (!state.session) {
      router.push("/auth");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (userVote === vote) {
      // Remove vote
      setVoteScore(voteScore - vote);
      setUserVote(null);
    } else if (userVote === null) {
      // Add vote
      setVoteScore(voteScore + vote);
      setUserVote(vote);
    } else {
      // Switch vote
      setVoteScore(voteScore + vote * 2);
      setUserVote(vote);
    }
  };

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

  const primaryCategory = getPostTag(post);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#5C4A4A" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Forum post</Text>
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
          {/* Post card */}
          <View style={styles.postCard}>
            <View style={styles.postContent}>
              <Text style={styles.categoryLabel}>{primaryCategory.toUpperCase()}</Text>
              <Text style={styles.title}>{post.title}</Text>
              <View style={styles.postMetaRow}>
                <Text style={styles.postMetaText}>
                  Posted by {post.author_name} ·{" "}
                  {new Date(post.created_at).toLocaleDateString([], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>

              {/* Inline voting controls */}
              <View style={styles.voteRow}>
                <Pressable
                  onPress={() => handleVote(1)}
                  style={styles.voteButton}
                >
                  <Ionicons
                    name={userVote === 1 ? "arrow-up" : "arrow-up-outline"}
                    size={16}
                    color={userVote === 1 ? "#FF8B60" : "#C4B5A5"}
                  />
                </Pressable>
                <Text
                  style={[
                    styles.voteScore,
                    voteScore > 0 && styles.voteScorePositive,
                    voteScore < 0 && styles.voteScoreNegative,
                  ]}
                >
                  {voteScore}
                </Text>
                <Pressable onPress={() => handleVote(-1)} style={styles.voteButton}>
                  <Ionicons
                    name={userVote === -1 ? "arrow-down" : "arrow-down-outline"}
                    size={16}
                    color={userVote === -1 ? "#7193FF" : "#C4B5A5"}
                  />
                </Pressable>
                <View style={styles.voteDivider} />
                <Ionicons name="chatbubble-outline" size={14} color="#B8A99A" />
                <Text style={styles.commentCountText}>{comments.length}</Text>
              </View>

              <Text style={styles.body}>{post.body}</Text>
              
              {/* Full image if exists */}
              {post.image_url && (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.postImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.warn("Failed to load post image:", error);
                  }}
                />
              )}
            </View>
          </View>

          {/* Flat comments section (NO THREADED REPLIES) */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
            </Text>
            
            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentContent}>
                  <View style={styles.commentTextContainer}>
                    <Text style={styles.commentAuthor}>{c.author_name}</Text>
                    <Text style={styles.commentBody}>{c.body}</Text>
                    {c.image_url && (
                      <Image
                        source={{ uri: c.image_url }}
                        style={styles.commentImage}
                        resizeMode="cover"
                        onError={(e) => console.warn("Failed to load comment image:", e)}
                      />
                    )}
                    <Text style={styles.commentDate}>
                      {new Date(c.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {isAdmin && (
                    <Pressable
                      onPress={() => handleDeleteComment(c.id)}
                      style={({ pressed }) => [
                        styles.deleteCommentButton,
                        pressed && styles.deleteButtonPressed,
                      ]}
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
                {selectedCommentImageUri ? (
                  <View style={styles.commentImagePreviewWrapper}>
                    <Image
                      source={{ uri: selectedCommentImageUri }}
                      style={styles.commentImagePreview}
                      resizeMode="cover"
                      onError={() => console.warn("Failed to load comment preview")}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeCommentImageButton,
                        pressed && styles.removeCommentImageButtonPressed,
                      ]}
                      onPress={() => setSelectedCommentImageUri(null)}
                      disabled={commentMutation.isPending}
                    >
                      <Ionicons name="close-circle" size={24} color="#FFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.addCommentImageButton,
                      pressed && styles.addCommentImageButtonPressed,
                      (commentMutation.isPending || isSelectingCommentImage) &&
                        styles.addCommentImageButtonDisabled,
                    ]}
                    onPress={handlePickCommentImage}
                    disabled={commentMutation.isPending || isSelectingCommentImage}
                  >
                    {isSelectingCommentImage ? (
                      <ActivityIndicator color="#8B7355" size="small" />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={20} color="#8B7355" />
                        <Text style={styles.addCommentImageText}>Add image</Text>
                      </>
                    )}
                  </Pressable>
                )}
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
    alignItems: "center",
    marginTop: 4,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5C4A4A",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFF0ED",
  },
  deleteButtonPressed: { opacity: 0.6 },
  scroll: { padding: 20, paddingBottom: 32 },
  postCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    overflow: "hidden",
  },
  postContent: {
    padding: 18,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B7355",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3D3230",
    lineHeight: 30,
    marginBottom: 10,
  },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  postMetaText: {
    fontSize: 12,
    color: "#B8A99A",
    fontWeight: "500",
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    gap: 4,
    opacity: 0.85,
  },
  voteButton: {
    padding: 4,
  },
  voteScore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B7355",
    marginHorizontal: 2,
    minWidth: 20,
    textAlign: "center",
  },
  voteScorePositive: {
    color: "#FF8B60",
  },
  voteScoreNegative: {
    color: "#7193FF",
  },
  voteDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#E8E0D5",
    marginHorizontal: 6,
  },
  commentCountText: {
    fontSize: 12,
    color: "#B8A99A",
    marginLeft: 4,
    fontWeight: "500",
  },
  body: {
    fontSize: 15,
    color: "#5C4A4A",
    lineHeight: 23,
    marginBottom: 16,
  },
  postImage: {
    width: "100%",
    height: 240,
    borderRadius: 8,
    backgroundColor: "#E8E0D5",
    marginTop: 4,
  },
  commentsSection: { marginTop: 8 },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5C4A4A",
    marginBottom: 16,
  },
  comment: {
    backgroundColor: "#FFFDF9",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  commentContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  commentTextContainer: { flex: 1, marginRight: 8 },
  commentAuthor: {
    fontSize: 13,
    color: "#8B7355",
    marginBottom: 4,
    fontWeight: "600",
  },
  commentBody: { fontSize: 15, color: "#5C4A4A", marginBottom: 4 },
  commentImage: {
    width: "100%",
    maxHeight: 200,
    height: 160,
    borderRadius: 8,
    backgroundColor: "#E8E0D5",
    marginTop: 8,
  },
  commentDate: { fontSize: 12, color: "#B8A99A", marginTop: 2 },
  addCommentImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E8E0D5",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  addCommentImageButtonPressed: { opacity: 0.7 },
  addCommentImageButtonDisabled: { opacity: 0.5 },
  addCommentImageText: { fontSize: 13, fontWeight: "600", color: "#8B7355" },
  commentImagePreviewWrapper: {
    position: "relative",
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  commentImagePreview: {
    width: "100%",
    height: 120,
    backgroundColor: "#E8E0D5",
  },
  removeCommentImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
  },
  removeCommentImageButtonPressed: { opacity: 0.8 },
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
    borderRadius: 8,
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
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  commentSubmitPressed: { opacity: 0.85 },
  commentSubmitText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  empty: { fontSize: 16, color: "#8B7355" },
});
