import { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useCommunityForum } from "../../contexts/CommunityForumContext";
import { colors } from "../theme";

export default function CommunityListScreen() {
  const router = useRouter();
  const { state } = useAuth();
  const { communities } = useCommunityForum();
  const [query, setQuery] = useState("");

  const isGuest = state.isGuest || !state.session;

  const filtered = communities.filter((community) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      community.name.toLowerCase().includes(q) ||
      community.description.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum</Text>
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#B8A99A" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search communities"
          placeholderTextColor="#B8A99A"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push(`/community/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="chatbubbles" size={20} color="#C4A77D" />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isJoined && (
                    <View style={styles.joinBadge}>
                      <Text style={styles.joinBadgeText}>Joined</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.cardFooter}>
                  <Ionicons
                    name="people-outline"
                    size={12}
                    color="#B8A99A"
                  />
                  <Text style={styles.cardMeta}>
                    {item.memberCount.toLocaleString()} members
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color="#B8A99A"
            />
            <Text style={styles.emptyTitle}>No communities found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search term or clear the filter.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#E8E0D5",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  joinBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
  },
  joinBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMeta: {
    fontSize: 13,
    color: "#B8A99A",
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
