/**
 * Forum tab: flat feed of posts from Supabase.
 * Reddit-like layout: post feed + post detail.
 * 
 * INTENTIONALLY FLAT DESIGN (NO HIERARCHY):
 * - No subforums
 * - No subcategories  
 * - No threaded replies
 * - Comments are ONE LEVEL ONLY (Post → Comments)
 */
import { useState, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useCanPost } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { queryKeys } from "../../lib/queryClient";
import { colors } from "../theme";
import { TAG_FILTERS, ForumTagFilter, getPostTag } from "../forum/tags";

type ForumPost = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_name: string;
  image_url: string | null;
  tag: string | null;
};

async function fetchForumPosts(): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("id, title, body, created_at, image_url, tag, author_id, profiles(name)")
    .order("created_at", { ascending: false });

  if (error) {
    if ((error as any).code === "42703") {
      const { data: fallback } = await supabase
        .from("forum_posts")
        .select("id, title, body, created_at, image_url, author_id, profiles(name)")
        .order("created_at", { ascending: false });
      return (fallback ?? []).map((row: any) => {
        const profile = row.profiles as { name?: string } | null;
        return {
          id: row.id,
          title: row.title,
          body: row.body,
          created_at: row.created_at,
          author_name: profile?.name ?? "Unknown",
          image_url: row.image_url ?? null,
          tag: null,
        };
      });
    }
    console.error("Error fetching forum posts:", error);
    return [];
  }
  if (!data) return [];

  return data.map((row: any) => {
    const profile = row.profiles as { name?: string } | null;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      created_at: row.created_at,
      author_name: profile?.name ?? "Unknown",
      image_url: row.image_url ?? null,
      tag: row.tag ?? null,
    };
  });
}

export default function ForumListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const canPost = useCanPost();
  const [tagFilter, setTagFilter] = useState<ForumTagFilter>("All");
  const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
  
  // MOCK: Local vote state (not persisted)
  const [postVotes, setPostVotes] = useState<Record<string, { score: number; userVote: number | null }>>({});

  const isGuest = state.isGuest || !state.session;

  const { data: posts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.forumPosts,
    queryFn: fetchForumPosts,
  });

  const filteredPosts = useMemo(() => {
    if (tagFilter === "All") return posts;
    return posts.filter((p) => getPostTag(p) === tagFilter);
  }, [posts, tagFilter]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    refetch();
  };

  // MOCK: Handle vote (local state only)
  const handleVote = (postId: string, vote: 1 | -1) => {
    if (!state.session) {
      router.push("/auth");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setPostVotes((prev) => {
      const current = prev[postId] || { score: 0, userVote: null };
      
      // Toggle logic: if clicking same vote, remove it
      if (current.userVote === vote) {
        return {
          ...prev,
          [postId]: { score: current.score - vote, userVote: null },
        };
      }
      
      // Switch from opposite vote or add new vote
      const scoreChange = current.userVote === null ? vote : vote * 2;
      return {
        ...prev,
        [postId]: { score: current.score + scoreChange, userVote: vote },
      };
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum</Text>
        {canPost && (
          <Pressable
            style={({ pressed }) => [
              styles.newPostButton,
              pressed && styles.newPostButtonPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push("/forum/new");
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.newPostButtonText}>New Post</Text>
          </Pressable>
        )}
      </View>

      {isGuest && (
        <View style={styles.banner}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textPrimary}
          />
          <Text style={styles.bannerText}>
            Sign up for free to post and comment in the forum.
          </Text>
        </View>
      )}

      <View style={styles.filterBar}>
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            pressed && styles.filterButtonPressed,
            tagFilter !== "All" && styles.filterButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setFilterSheetVisible(true);
          }}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={tagFilter !== "All" ? "#FFF" : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              tagFilter !== "All" && styles.filterButtonTextActive,
            ]}
            numberOfLines={1}
          >
            {tagFilter !== "All" ? `Filter: ${tagFilter}` : "Filters"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isFilterSheetVisible}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <SafeAreaView style={styles.drawerContainer} edges={["top", "bottom"]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Filter posts</Text>
            <Pressable
              style={({ pressed }) => [styles.drawerCloseButton, pressed && styles.drawerClosePressed]}
              onPress={() => setFilterSheetVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.drawerContent}>
            <Text style={styles.drawerSectionLabel}>Category</Text>
            <Text style={styles.drawerSectionHint}>Select one</Text>
            <View style={styles.drawerPillsRow}>
              {TAG_FILTERS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.drawerPill, tagFilter === t && styles.drawerPillActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setTagFilter(t);
                  }}
                >
                  <Text
                    style={[
                      styles.drawerPillText,
                      tagFilter === t && styles.drawerPillTextActive,
                    ]}
                  >
                    {t === "All" ? "All" : t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.drawerClearButton, pressed && styles.drawerClearPressed]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTagFilter("All");
              }}
            >
              <Text style={styles.drawerClearText}>Clear filters</Text>
            </Pressable>
          </View>
          <View style={styles.drawerFooter}>
            <Pressable
              style={({ pressed }) => [styles.drawerApplyButton, pressed && styles.drawerApplyPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setFilterSheetVisible(false);
              }}
            >
              <Text style={styles.drawerApplyText}>Apply</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: "70%", marginTop: 8 }]} />
              <View style={[styles.skeletonLine, { width: "90%", height: 14, marginTop: 8 }]} />
              <View style={[styles.skeletonLine, { width: "60%", height: 12, marginTop: 12 }]} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.textSecondary}
            />
          }
          renderItem={({ item }) => {
            const primaryCategory = getPostTag(item);
            const voteData = postVotes[item.id] || { score: 0, userVote: null };
            
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.push(`/forum/${item.id}`);
              }}
              >
                <Text style={styles.cardCategory}>{primaryCategory.toUpperCase()}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardBody} numberOfLines={3}>
                  {item.body}
                </Text>

                {/* Full-width image preview if exists */}
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.warn("Failed to load post image:", error);
                    }}
                  />
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>
                    {item.author_name} · {new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  {/* Inline voting controls */}
                  <View style={styles.voteRow}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, 1);
                      }}
                      style={styles.voteButton}
                    >
                      <Ionicons
                        name={voteData.userVote === 1 ? "arrow-up" : "arrow-up-outline"}
                        size={14}
                        color={voteData.userVote === 1 ? "#FF8B60" : "#C4B5A5"}
                      />
                    </Pressable>
                    <Text
                      style={[
                        styles.voteScore,
                        voteData.score > 0 && styles.voteScorePositive,
                        voteData.score < 0 && styles.voteScoreNegative,
                      ]}
                    >
                      {voteData.score}
                    </Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, -1);
                      }}
                      style={styles.voteButton}
                    >
                      <Ionicons
                        name={voteData.userVote === -1 ? "arrow-down" : "arrow-down-outline"}
                        size={14}
                        color={voteData.userVote === -1 ? "#7193FF" : "#C4B5A5"}
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color="#B8A99A"
              />
              <Text style={styles.emptyTitle}>
                {posts.length === 0
                  ? "No posts yet"
                  : "No posts match this filter"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {posts.length === 0 && canPost
                  ? "Be the first to start a conversation."
                  : posts.length === 0
                    ? "Sign up to post and join the discussion."
                    : "Try a different category filter."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  newPostButtonPressed: {
    opacity: 0.9,
  },
  newPostButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFDF9",
    borderBottomWidth: 1,
    borderColor: "#E8E0D5",
  },
  bannerText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFF",
  },
  filterButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: 200,
  },
  filterButtonTextActive: {
    color: "#FFF",
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  drawerCloseButton: {
    padding: 8,
    borderRadius: 20,
  },
  drawerClosePressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  drawerContent: {
    flex: 1,
    padding: 20,
  },
  drawerSectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  drawerSectionHint: {
    fontSize: 13,
    color: "#B8A99A",
    marginBottom: 12,
  },
  drawerPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  drawerPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#FFF",
  },
  drawerPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  drawerPillText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  drawerPillTextActive: {
    color: "#FFF",
  },
  drawerClearButton: {
    marginTop: 28,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  drawerClearPressed: {
    opacity: 0.7,
  },
  drawerClearText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  drawerFooter: {
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  drawerApplyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  drawerApplyPressed: {
    opacity: 0.9,
  },
  drawerApplyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  skeletonList: {
    padding: 16,
    paddingTop: 8,
  },
  skeletonCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  skeletonLine: {
    height: 16,
    backgroundColor: "#E8E0D5",
    borderRadius: 4,
    width: "100%",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFDF9",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    overflow: "hidden",
    padding: 16,
  },
  cardPressed: {
    opacity: 0.95,
    backgroundColor: "#F5F0EB",
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B7355",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D3230",
    marginBottom: 8,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 13,
    color: "#8B7355",
    marginBottom: 12,
    lineHeight: 19,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    backgroundColor: "#E8E0D5",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: "#B8A99A",
    fontWeight: "500",
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.8,
  },
  voteButton: {
    padding: 4,
  },
  voteScore: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8B7355",
    marginHorizontal: 2,
    minWidth: 18,
    textAlign: "center",
  },
  voteScorePositive: {
    color: "#FF8B60",
  },
  voteScoreNegative: {
    color: "#7193FF",
  },
  emptyState: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#B8A99A",
    textAlign: "center",
    marginTop: 6,
  },
});
