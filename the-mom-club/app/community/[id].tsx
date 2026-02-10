import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCommunityForum } from "../../contexts/CommunityForumContext";
import { useAuth } from "../../contexts/AuthContext";
import { colors } from "../theme";
import { TagPill } from "../components/TagPill";
import { TAG_FILTERS, ForumTagFilter, inferTagsForPost } from "../forum/tags";

type SortOption = "Newest" | "Top" | "Most Commented";
type ContentTypeFilter = "All" | "Text" | "Photo" | "Link";

type FilterButtonProps = {
  activeCount: number;
  onPress: () => void;
};

function FilterButton({ activeCount, onPress }: FilterButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        pressed && styles.filterButtonPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
      <Text style={styles.filterButtonLabel}>Filters</Text>
      {activeCount > 0 && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

type FilterSheetProps = {
  visible: boolean;
  draftTag: ForumTagFilter;
  setDraftTag: (value: ForumTagFilter) => void;
  draftSort: SortOption;
  setDraftSort: (value: SortOption) => void;
  draftContentType: ContentTypeFilter;
  setDraftContentType: (value: ContentTypeFilter) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

function FilterBottomSheet({
  visible,
  draftTag,
  setDraftTag,
  draftSort,
  setDraftSort,
  draftContentType,
  setDraftContentType,
  onClear,
  onApply,
  onClose,
}: FilterSheetProps) {
  const sortOptions: SortOption[] = ["Newest", "Top", "Most Commented"];
  const contentTypeOptions: ContentTypeFilter[] = ["All", "Text", "Photo", "Link"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={styles.sheetBackdropTouchable} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable
              style={styles.sheetCloseButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.sheetContent}>
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Topic</Text>
              <View style={styles.sheetChipsRow}>
                {TAG_FILTERS.map((tag) => (
                  <Pressable
                    key={tag}
                    style={({ pressed }) => [
                      styles.sheetChip,
                      draftTag === tag && styles.sheetChipActive,
                      pressed && styles.sheetChipPressed,
                    ]}
                    onPress={() => setDraftTag(tag)}
                  >
                    <Text
                      style={[
                        styles.sheetChipLabel,
                        draftTag === tag && styles.sheetChipLabelActive,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Sort by</Text>
              {sortOptions.map((sort) => (
                <Pressable
                  key={sort}
                  style={({ pressed }) => [
                    styles.sheetOptionRow,
                    draftSort === sort && styles.sheetOptionRowActive,
                    pressed && styles.sheetOptionRowPressed,
                  ]}
                  onPress={() => setDraftSort(sort)}
                >
                  <View
                    style={[
                      styles.sheetRadioOuter,
                      draftSort === sort && styles.sheetRadioOuterActive,
                    ]}
                  >
                    {draftSort === sort && <View style={styles.sheetRadioInner} />}
                  </View>
                  <Text style={styles.sheetOptionLabel}>{sort}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>Content type</Text>
              {contentTypeOptions.map((type) => (
                <Pressable
                  key={type}
                  style={({ pressed }) => [
                    styles.sheetOptionRow,
                    draftContentType === type && styles.sheetOptionRowActive,
                    pressed && styles.sheetOptionRowPressed,
                  ]}
                  onPress={() => setDraftContentType(type)}
                >
                  <View
                    style={[
                      styles.sheetRadioOuter,
                      draftContentType === type && styles.sheetRadioOuterActive,
                    ]}
                  >
                    {draftContentType === type && (
                      <View style={styles.sheetRadioInner} />
                    )}
                  </View>
                  <Text style={styles.sheetOptionLabel}>{type}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.sheetFooter}>
            <Pressable
              style={({ pressed }) => [
                styles.sheetClearButton,
                pressed && styles.sheetClearButtonPressed,
              ]}
              onPress={onClear}
            >
              <Text style={styles.sheetClearButtonText}>Clear all</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.sheetApplyButton,
                pressed && styles.sheetApplyButtonPressed,
              ]}
              onPress={onApply}
            >
              <Text style={styles.sheetApplyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCommunityById, getPostsForCommunity, toggleJoinCommunity } =
    useCommunityForum();
  const { state } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "about">("posts");
  const [appliedTagFilter, setAppliedTagFilter] = useState<ForumTagFilter>("All");
  const [appliedSort, setAppliedSort] = useState<SortOption>("Newest");
  const [appliedContentType, setAppliedContentType] =
    useState<ContentTypeFilter>("All");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [draftTagFilter, setDraftTagFilter] = useState<ForumTagFilter>("All");
  const [draftSort, setDraftSort] = useState<SortOption>("Newest");
  const [draftContentType, setDraftContentType] =
    useState<ContentTypeFilter>("All");

  const communityId = typeof id === "string" ? id : "";
  const community = communityId ? getCommunityById(communityId) : undefined;
  const posts = community ? getPostsForCommunity(community.id) : [];
  const isGuest = state.isGuest || !state.session;

  const activeFilterCount =
    (appliedTagFilter !== "All" ? 1 : 0) +
    (appliedSort !== "Newest" ? 1 : 0) +
    (appliedContentType !== "All" ? 1 : 0);

  const handleOpenFilters = () => {
    setDraftTagFilter(appliedTagFilter);
    setDraftSort(appliedSort);
    setDraftContentType(appliedContentType);
    setFilterSheetVisible(true);
  };

  const handleApplyFilters = () => {
    setAppliedTagFilter(draftTagFilter);
    setAppliedSort(draftSort);
    setAppliedContentType(draftContentType);
    setFilterSheetVisible(false);
  };

  const handleClearFilters = () => {
    setDraftTagFilter("All");
    setDraftSort("Newest");
    setDraftContentType("All");
  };

  const filteredAndSortedPosts = posts
    .filter((item) => {
      if (appliedTagFilter === "All") return true;
      const tags = inferTagsForPost(item.title, item.body);
      return tags.includes(appliedTagFilter);
    })
    .filter((item) => {
      if (appliedContentType === "All") return true;
      const hasPhoto = !!item.mediaUri;
      if (appliedContentType === "Photo") return hasPhoto;
      if (appliedContentType === "Text") return !hasPhoto;
      // No link posts in MVP; treat as no matches
      if (appliedContentType === "Link") return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (appliedSort === "Newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (appliedSort === "Top") {
        return b.voteCount - a.voteCount;
      }
      if (appliedSort === "Most Commented") {
        return b.commentCount - a.commentCount;
      }
      return 0;
    });

  const showAuthRequiredAlert = () => {
    Alert.alert(
      "Sign in to join",
      "You need to sign in to join communities and participate in the forum.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Sign up now",
          onPress: () => router.push("/auth"),
        },
      ]
    );
  };

  if (!community) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notFound}>Community not found.</Text>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.name} numberOfLines={2}>
            {community.name}
          </Text>
          <Text style={styles.meta}>
            {community.memberCount.toLocaleString()} members
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.joinButton,
            community.isJoined ? styles.joinButtonActive : styles.joinButtonPrimary,
            pressed && styles.joinButtonPressed,
          ]}
          onPress={() => {
            if (isGuest) {
              showAuthRequiredAlert();
              return;
            }
            toggleJoinCommunity(community.id);
          }}
        >
          <View style={styles.joinButtonContent}>
            <Ionicons
              name={community.isJoined ? "checkmark-circle" : "add-circle-outline"}
              size={16}
              color={community.isJoined ? colors.textPrimary : "#FFF"}
            />
            <Text
              style={[
                styles.joinButtonText,
                community.isJoined && styles.joinButtonTextActive,
              ]}
            >
              {community.isJoined ? "Joined" : "Join"}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.descriptionWrapper}>
        <Text style={styles.description}>{community.description}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.rulesHeader,
          pressed && styles.rulesHeaderPressed,
        ]}
        onPress={() => setRulesOpen((prev) => !prev)}
      >
        <View style={styles.rulesTitleRow}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.rulesTitle}>Community Rules</Text>
        </View>
        <Ionicons
          name={rulesOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {rulesOpen && (
        <View style={styles.rulesBody}>
          {community.rules.map((rule, index) => (
            <View key={index} style={styles.ruleRow}>
              <View style={styles.ruleBullet} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tabs}>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === "posts" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          onPress={() => setActiveTab("posts")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "posts" && styles.tabLabelActive,
            ]}
          >
            Posts
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === "about" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          onPress={() => setActiveTab("about")}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === "about" && styles.tabLabelActive,
            ]}
          >
            About
          </Text>
        </Pressable>
      </View>

      {activeTab === "about" ? (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutHeading}>About this community</Text>
          <Text style={styles.aboutText}>{community.description}</Text>
          <Text style={styles.aboutHeading}>Rules</Text>
          {community.rules.map((rule, index) => (
            <View key={index} style={styles.ruleRow}>
              <View style={styles.ruleBullet} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          {!isGuest && community.isJoined && (
            <View style={styles.newPostWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.newPostButton,
                  pressed && styles.newPostButtonPressed,
                ]}
                onPress={() => router.push(`/community/${community.id}/new`)}
              >
                <Ionicons name="create-outline" size={16} color="#FFF" />
                <Text style={styles.newPostButtonText}>Start a thread</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.filterRow}>
            <View style={styles.filterSummaryWrapper}>
              <Text style={styles.filterSummaryText} numberOfLines={1}>
                {appliedTagFilter === "All"
                  ? "All topics"
                  : appliedTagFilter}{" "}
                • {appliedSort}
              </Text>
            </View>
            <FilterButton
              activeCount={activeFilterCount}
              onPress={handleOpenFilters}
            />
          </View>
          <FlatList
            data={filteredAndSortedPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postsList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const tags = inferTagsForPost(item.title, item.body);
              const visibleTags = tags.slice(0, 2);
              const extraCount = tags.length - visibleTags.length;

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.postCard,
                    pressed && styles.postCardPressed,
                  ]}
                  onPress={() => router.push(`/community/post/${item.id}`)}
                >
                  <View style={styles.postHeaderRow}>
                    <Text style={styles.postTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                  {visibleTags.length > 0 && (
                    <View style={styles.postTagRow}>
                      {visibleTags.map((tag) => (
                        <TagPill key={tag} label={tag} />
                      ))}
                      {extraCount > 0 && (
                        <TagPill label={`+${extraCount}`} />
                      )}
                    </View>
                  )}
                  <Text style={styles.postBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <View style={styles.postMetaRow}>
                    <Text style={styles.postMeta}>
                      Posted by {item.authorName}
                    </Text>
                    <Text style={styles.postMeta}>
                      {new Date(item.createdAt).toLocaleDateString([], {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.postStatsRow}>
                    <View style={styles.postStat}>
                      <Ionicons name="arrow-up" size={14} color="#B8A99A" />
                      <Text style={styles.postStatText}>{item.voteCount}</Text>
                    </View>
                    <View style={styles.postStat}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color="#B8A99A"
                      />
                      <Text style={styles.postStatText}>
                        {item.commentCount} comments
                      </Text>
                    </View>
                  </View>
                  {item.mediaUri && (
                    <View style={styles.postImageWrapper}>
                      <Image
                        source={{ uri: item.mediaUri }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyPosts}>
                <Text style={styles.emptyPostsTitle}>
                  {posts.length === 0
                    ? "No posts yet"
                    : "No posts match these filters"}
                </Text>
                <Text style={styles.emptyPostsSubtitle}>
                  {posts.length === 0
                    ? "This community will feel cozy soon."
                    : "Try adjusting or clearing your filters."}
                </Text>
              </View>
            }
          />
          <FilterBottomSheet
            visible={filterSheetVisible}
            draftTag={draftTagFilter}
            setDraftTag={setDraftTagFilter}
            draftSort={draftSort}
            setDraftSort={setDraftSort}
            draftContentType={draftContentType}
            setDraftContentType={setDraftContentType}
            onClear={handleClearFilters}
            onApply={handleApplyFilters}
            onClose={() => setFilterSheetVisible(false)}
          />
        </>
      )}
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
    paddingBottom: 10,
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
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: "#B8A99A",
    marginTop: 4,
  },
  joinButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  joinButtonPrimary: {
    backgroundColor: colors.primary,
  },
  joinButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  joinButtonPressed: {
    opacity: 0.9,
  },
  joinButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  joinButtonTextActive: {
    color: colors.textPrimary,
  },
  descriptionWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFDF9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E8E0D5",
  },
  rulesHeaderPressed: {
    opacity: 0.9,
  },
  rulesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  rulesBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFDF9",
    borderBottomWidth: 1,
    borderColor: "#E8E0D5",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  ruleBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: "#F5F0EB",
    padding: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: "#FFF",
  },
  tabPressed: {
    opacity: 0.9,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  aboutHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  postsList: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  filterSummaryWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  filterSummaryText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  newPostWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
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
  postCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  postCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  postTagRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    marginTop: 4,
    marginBottom: 4,
  },
  postHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  postBody: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  postMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postMeta: {
    fontSize: 12,
    color: "#B8A99A",
  },
  postStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  postStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: "#B8A99A",
  },
  postImageWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  postImage: {
    width: "100%",
    height: 140,
  },
  emptyPosts: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyPostsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptyPostsSubtitle: {
    fontSize: 14,
    color: "#B8A99A",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  filterButtonPressed: {
    opacity: 0.9,
  },
  filterButtonLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  filterBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetBackdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFDF9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0D6C8",
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sheetCloseButton: {
    padding: 6,
    borderRadius: 16,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sheetSection: {
    marginTop: 10,
    marginBottom: 4,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  sheetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFF",
  },
  sheetChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  sheetChipPressed: {
    opacity: 0.9,
  },
  sheetChipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sheetChipLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  sheetOptionRowActive: {
    backgroundColor: "#FFF7EF",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  sheetOptionRowPressed: {
    opacity: 0.9,
  },
  sheetRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D3C4B6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sheetRadioOuterActive: {
    borderColor: colors.primary,
  },
  sheetRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  sheetOptionLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#E8E0D5",
  },
  sheetClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sheetClearButtonPressed: {
    opacity: 0.8,
  },
  sheetClearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  sheetApplyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  sheetApplyButtonPressed: {
    opacity: 0.9,
  },
  sheetApplyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});

