import { useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
  Alert,
} from "react-native";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCommunityForum, ForumComment } from "../../../contexts/CommunityForumContext";
import { useAuth, useIsAdmin } from "../../../contexts/AuthContext";
import { colors } from "../../theme";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useAuth();
  const {
    getPostById,
    getCommunityById,
    togglePostVote,
    addReply,
    toggleCommentVote,
    deletePost,
  } = useCommunityForum();
  const scrollRef = useRef<ScrollView | null>(null);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [replyImageUri, setReplyImageUri] = useState<string | null>(null);
  const [newCommentImageUri, setNewCommentImageUri] = useState<string | null>(null);

  const postId = typeof id === "string" ? id : "";
  const post = postId ? getPostById(postId) : undefined;
  const community = post ? getCommunityById(post.communityId) : undefined;

  const isGuest = state.isGuest || !state.session;
  const isAdmin = useIsAdmin();

  const showAuthRequiredAlert = () => {
    Alert.alert(
      "Sign in to participate",
      "You need to sign in to vote and reply in the forum.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Sign up now",
          onPress: () => router.push("/auth"),
        },
      ]
    );
  };

  if (!post || !community) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notFound}>Post not found.</Text>
      </SafeAreaView>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Not strictly needed, but kept in case we want to react to scroll later
    return event.nativeEvent.contentOffset.y;
  };

  const handleScrollToComments = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: commentsOffset, animated: true });
    }
  };

  const handleReplyPress = (commentId: string) => {
    if (isGuest) {
      showAuthRequiredAlert();
      return;
    }
    setReplyingToId((current) => (current === commentId ? null : commentId));
    setReplyText("");
    setReplyImageUri(null);
  };

  const handleSubmitReply = (parentId: string | null) => {
    if (!replyText.trim()) return;
    if (isGuest) {
      showAuthRequiredAlert();
      return;
    }
    addReply(post.id, parentId, replyText, undefined, replyImageUri || undefined);
    setReplyText("");
    setReplyImageUri(null);
    setReplyingToId(null);
  };

  const handleSubmitNewComment = () => {
    if (!newCommentText.trim()) return;
    if (isGuest) {
      showAuthRequiredAlert();
      return;
    }
    addReply(post.id, null, newCommentText, undefined, newCommentImageUri || undefined);
    setNewCommentText("");
    setNewCommentImageUri(null);
  };

  const pickImage = async (onPicked: (uri: string | null) => void) => {
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
        onPicked(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Image pick failed", error);
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const topLevelComments = post.comments.filter((c) => c.parentId === null);

  const renderCommentTree = (comment: ForumComment, depth: number = 0): JSX.Element => {
    const children = post.comments.filter((c) => c.parentId === comment.id);
    const clampedDepth = Math.min(depth, 2);

    return (
      <View
        key={comment.id}
        style={[
          styles.commentContainer,
          clampedDepth > 0 && styles.commentContainerNested,
          { marginLeft: clampedDepth * 10 },
        ]}
      >
        {clampedDepth > 0 && <View style={styles.threadLine} />}
        <View style={[styles.commentCard, clampedDepth > 0 && styles.commentCardNested]}>
          <View style={styles.commentHeaderRow}>
            <Text style={styles.commentAuthor}>{comment.authorName}</Text>
            <Text style={styles.commentMeta}>
              {new Date(comment.createdAt).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
          <View style={styles.commentFooterRow}>
            <View style={styles.commentVotesRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.commentVoteButton,
                  pressed && styles.commentVoteButtonPressed,
                ]}
                onPress={() => {
                  if (isGuest) {
                    showAuthRequiredAlert();
                    return;
                  }
                  Haptics.selectionAsync();
                  toggleCommentVote(post.id, comment.id, "up");
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={12}
                  color={
                    comment.userVote === "up"
                      ? colors.primary
                      : "#B8A99A"
                  }
                />
              </Pressable>
              <Text
                style={[
                  styles.commentVotesText,
                  (comment.userVote === "up" || comment.userVote === "down") &&
                    styles.commentVotesTextActive,
                ]}
              >
                {comment.voteCount}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.commentVoteButton,
                  pressed && styles.commentVoteButtonPressed,
                ]}
                onPress={() => {
                  if (isGuest) {
                    showAuthRequiredAlert();
                    return;
                  }
                  Haptics.selectionAsync();
                  toggleCommentVote(post.id, comment.id, "down");
                }}
              >
                <Ionicons
                  name="arrow-down"
                  size={12}
                  color={
                    comment.userVote === "down"
                      ? colors.primary
                      : "#B8A99A"
                  }
                />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.replyButton,
                pressed && styles.replyButtonPressed,
              ]}
              onPress={() => handleReplyPress(comment.id)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </Pressable>
          </View>
          {comment.mediaUri && (
            <View style={styles.commentMediaWrapper}>
              <Image
                source={{ uri: comment.mediaUri }}
                style={styles.commentMedia}
                resizeMode="cover"
              />
            </View>
          )}
          {replyingToId === comment.id && (
            <View style={styles.replyInputBlock}>
              <View style={styles.replyInputRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write a reply..."
                  placeholderTextColor="#B8A99A"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
              </View>
              <View style={styles.replyActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.replyAttachButton,
                    pressed && styles.replyAttachButtonPressed,
                  ]}
                  onPress={() => pickImage(setReplyImageUri)}
                >
                  <Ionicons name="image-outline" size={16} color={colors.primary} />
                  <Text style={styles.replyAttachText}>
                    {replyImageUri ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.replySendButton,
                    pressed && styles.replySendButtonPressed,
                    !replyText.trim() && styles.replySendButtonDisabled,
                  ]}
                  onPress={() => handleSubmitReply(comment.id)}
                  disabled={!replyText.trim()}
                >
                  <Ionicons name="send" size={14} color="#FFF" />
                </Pressable>
              </View>
              {replyImageUri && (
                <View style={styles.replyPreviewWrapper}>
                  <Image
                    source={{ uri: replyImageUri }}
                    style={styles.replyPreviewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}
        </View>
        {children.length > 0 && (
          <View style={{ marginTop: 6, marginLeft: clampedDepth > 0 ? 10 : 0 }}>
            <Pressable
              style={({ pressed }) => [
                styles.replyButton,
                pressed && styles.replyButtonPressed,
              ]}
              onPress={() =>
                setExpandedThreads((prev) => ({
                  ...prev,
                  [comment.id]: !prev[comment.id],
                }))
              }
            >
              <Text style={styles.replyButtonText}>
                {expandedThreads[comment.id]
                  ? "Hide replies"
                  : `View ${children.length} repl${
                      children.length === 1 ? "y" : "ies"
                    }`}
              </Text>
            </Pressable>
            {expandedThreads[comment.id] &&
              children.map((child) => renderCommentTree(child, clampedDepth + 1))}
          </View>
        )}
      </View>
    );
  };

  const handleDeletePost = () => {
    Alert.alert(
      "Delete thread",
      "Are you sure you want to delete this thread and all of its comments? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePost(post.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.communityName} numberOfLines={1}>
            {community.name}
          </Text>
          <Text style={styles.headerMeta}>
            Posted by {post.authorName} •{" "}
            {new Date(post.createdAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        {isAdmin && (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            onPress={handleDeletePost}
          >
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.postCard}>
            <View style={styles.postHeaderRow}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarInitial}>
                  {post.authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.postHeaderText}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postMetaText}>
                  <Text style={styles.postMetaAuthor}>Posted by {post.authorName}</Text>
                  <Text style={styles.postMetaSeparator}> • </Text>
                  <Text style={styles.postMetaCommunity}>{community.name}</Text>
                  <Text style={styles.postMetaSeparator}> • </Text>
                  <Text style={styles.postMetaDate}>
                    {new Date(post.createdAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </Text>
              </View>
            </View>
            <Text style={styles.postBody}>{post.body}</Text>
            {post.mediaUri && (
              <View style={styles.mediaWrapper}>
                <Image
                  source={{ uri: post.mediaUri }}
                  style={styles.media}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.voteButton,
                  pressed && styles.voteButtonPressed,
                ]}
                onPress={() => {
                  if (isGuest) {
                    showAuthRequiredAlert();
                    return;
                  }
                  Haptics.selectionAsync();
                  togglePostVote(post.id, "up");
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={post.userVote === "up" ? colors.primary : colors.textSecondary}
                />
              </Pressable>
              <Text style={styles.voteCount}>{post.voteCount}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.voteButton,
                  pressed && styles.voteButtonPressed,
                ]}
                onPress={() => {
                  if (isGuest) {
                    showAuthRequiredAlert();
                    return;
                  }
                  Haptics.selectionAsync();
                  togglePostVote(post.id, "down");
                }}
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={post.userVote === "down" ? colors.primary : colors.textSecondary}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.commentButton,
                  pressed && styles.commentButtonPressed,
                ]}
                onPress={handleScrollToComments}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.commentButtonText}>
                  {post.commentCount} comments
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={styles.commentsHeaderWrapper}
            onLayout={(event) =>
              setCommentsOffset(event.nativeEvent.layout.y - 80)
            }
          >
            <Text style={styles.commentsTitle}>
              Comments ({post.commentCount})
            </Text>
          </View>

          {topLevelComments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtitle}>
                Be the first to start the conversation.
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {topLevelComments.map((c) => renderCommentTree(c, 0))}
            </View>
          )}

          {!isGuest && (
            <View style={styles.newCommentContainer}>
              <Text style={styles.newCommentLabel}>Add a comment</Text>
              <View style={styles.newCommentRow}>
                <TextInput
                  style={styles.newCommentInput}
                  placeholder="Share your thoughts..."
                  placeholderTextColor="#B8A99A"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  multiline
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.newCommentAttachButton,
                    pressed && styles.newCommentAttachButtonPressed,
                  ]}
                  onPress={() => pickImage(setNewCommentImageUri)}
                >
                  <Ionicons name="image-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.newCommentSendButton,
                    pressed && styles.newCommentSendButtonPressed,
                    !newCommentText.trim() && styles.newCommentSendButtonDisabled,
                  ]}
                  onPress={handleSubmitNewComment}
                  disabled={!newCommentText.trim()}
                >
                  <Ionicons name="send" size={16} color="#FFF" />
                </Pressable>
              </View>
              {newCommentImageUri && (
                <View style={styles.newCommentPreviewWrapper}>
                  <Image
                    source={{ uri: newCommentImageUri }}
                    style={styles.newCommentPreviewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}

          {isGuest && (
            <View style={styles.signUpPrompt}>
              <Text style={styles.signUpPromptText}>
                Sign up for free to join the conversation and post comments.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.signUpButton,
                  pressed && styles.signUpButtonPressed,
                ]}
                onPress={() => router.push("/auth")}
              >
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              </Pressable>
            </View>
          )}
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
    backgroundColor: colors.background,
  },
  notFound: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  backButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  headerText: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: "#FFF0ED",
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  communityName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerMeta: {
    fontSize: 12,
    color: "#B8A99A",
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  postHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  postAvatarInitial: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  postHeaderText: {
    flex: 1,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postBody: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  postMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  postMetaAuthor: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  postMetaCommunity: {
    color: colors.textSecondary,
  },
  postMetaDate: {
    color: "#B8A99A",
  },
  postMetaSeparator: {
    color: "#B8A99A",
  },
  mediaWrapper: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  media: {
    width: "100%",
    height: 180,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  voteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  voteButtonPressed: {
    backgroundColor: "#F5F0EB",
    transform: [{ scale: 0.96 }],
  },
  voteCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: "center",
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  commentButtonPressed: {
    opacity: 0.9,
  },
  commentButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  commentsHeaderWrapper: {
    marginTop: 10,
    marginBottom: 6,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  commentsList: {
    marginTop: 6,
  },
  commentContainer: {
    marginBottom: 10,
    position: "relative",
  },
  commentContainerNested: {
    paddingLeft: 10,
  },
  threadLine: {
    position: "absolute",
    left: 2,
    top: 4,
    bottom: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#E3D9CC",
  },
  commentCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  commentCardNested: {
    backgroundColor: "#FFF9F3",
  },
  commentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  commentMeta: {
    fontSize: 11,
    color: "#B8A99A",
  },
  commentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentVotesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentVotesText: {
    fontSize: 12,
    color: "#B8A99A",
  },
  commentVotesTextActive: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  commentVoteButton: {
    padding: 6,
    borderRadius: 999,
  },
  commentVoteButtonPressed: {
    backgroundColor: "#F5F0EB",
    transform: [{ scale: 0.96 }],
  },
  replyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  replyButtonPressed: {
    backgroundColor: "#F5F0EB",
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  commentMediaWrapper: {
    marginTop: 6,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  commentMedia: {
    width: "100%",
    height: 140,
  },
  replyInputBlock: {
    marginTop: 8,
  },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E0D5",
    fontSize: 13,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  replyActionsRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  replyAttachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  replyAttachButtonPressed: {
    opacity: 0.9,
  },
  replyAttachText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  replySendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  replySendButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  replySendButtonDisabled: {
    opacity: 0.5,
  },
  replyPreviewWrapper: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  replyPreviewImage: {
    width: "100%",
    height: 140,
  },
  newCommentContainer: {
    marginTop: 18,
  },
  newCommentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  newCommentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  newCommentInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E0D5",
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  newCommentAttachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  newCommentAttachButtonPressed: {
    opacity: 0.9,
  },
  newCommentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  newCommentSendButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  newCommentSendButtonDisabled: {
    opacity: 0.5,
  },
  newCommentPreviewWrapper: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  newCommentPreviewImage: {
    width: "100%",
    height: 140,
  },
  emptyComments: {
    marginTop: 16,
    alignItems: "center",
  },
  emptyCommentsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyCommentsSubtitle: {
    fontSize: 13,
    color: "#B8A99A",
    marginTop: 4,
  },
  signUpPrompt: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    alignItems: "center",
  },
  signUpPromptText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  signUpButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#C4A77D",
  },
  signUpButtonPressed: {
    opacity: 0.9,
  },
  signUpButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});

