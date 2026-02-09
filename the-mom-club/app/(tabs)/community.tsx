import { useEffect, useState } from "react";
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth, useCanPost } from "../../contexts/AuthContext";

type Post = { id: string; title: string; body: string; created_at: string };

export default function ForumListScreen() {
  const router = useRouter();
  const { state } = useAuth();
  const canPost = useCanPost();
  const isGuest = state.isGuest;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false });
    if (!error) setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Refresh posts when screen comes into focus (e.g., after creating a new post)
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forum</Text>
        {canPost && (
          <Pressable
            style={({ pressed }) => [styles.newPostButton, pressed && styles.newPostButtonPressed]}
            onPress={() => router.push("/forum/new")}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.newPostButtonText}>New post</Text>
          </Pressable>
        )}
      </View>
      {!canPost && isGuest && (
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={18} color="#5C4A4A" />
          <Text style={styles.bannerText}>Sign up for free to post and comment in the forum.</Text>
        </View>
      )}
      {posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color="#B8A99A" />
          <Text style={styles.empty}>No posts yet.</Text>
          <Text style={styles.emptySubtext}>Be the first to start a conversation!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/forum/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#C4A77D" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
                  <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={12} color="#B8A99A" />
                    <Text style={styles.cardDate}>
                      {new Date(item.created_at).toLocaleDateString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff7f2",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#5C4A4A",
  },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#A8C6B6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newPostButtonPressed: { opacity: 0.85 },
  newPostButtonText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    paddingHorizontal: 40,
  },
  empty: { 
    fontSize: 18, 
    fontWeight: "600",
    color: "#8B7355",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#B8A99A",
    marginTop: 8,
    textAlign: "center",
  },
  list: { padding: 20, paddingTop: 8, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#5C4A4A",
    marginBottom: 8,
    lineHeight: 24,
  },
  cardBody: { 
    fontSize: 15, 
    color: "#8B7355", 
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDate: { 
    fontSize: 13, 
    color: "#B8A99A",
    fontWeight: "500",
  },
  banner: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14, 
    backgroundColor: "#FFFDF9", 
    marginHorizontal: 20, 
    marginBottom: 12, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  bannerText: { 
    fontSize: 14, 
    color: "#5C4A4A",
    flex: 1,
    lineHeight: 20,
  },
});
