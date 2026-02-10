import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../../components/Logo";
import { colors } from "../theme";

type CardData = {
  id: string;
  title: string;
  description?: string;
  image: string;
  hasVideo?: boolean;
};

function ContentCard({ card, onPress }: { card: CardData; onPress: () => void }) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {!imageError ? (
        <Image 
          source={{ uri: card.image }} 
          style={styles.cardImage} 
          contentFit="cover" 
          transition={500} 
          cachePolicy="memory-disk"
          onError={(error) => {
            console.error(`Failed to load image for ${card.id}:`, card.image, error);
            setImageError(true);
          }}
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="calendar-outline" size={48} color="#B8A99A" />
        </View>
      )}
      <View style={styles.cardOverlay}>
        {"hasVideo" in card && card.hasVideo && (
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#A8C6B6" />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          {"description" in card && (
            <Text style={styles.cardDescription}>{card.description}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const GUEST_CARDS = [
  { id: "forum", title: "Forum", description: "Read conversations from our community", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop" },
];

const FREE_CARDS = [
  { id: "forum", title: "Forum", description: "Connect and engage with other moms", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop" },
];

// Note: Fitness Coaching intentionally omitted from MVP
const MEMBER_CARDS = [
  { id: "forum", title: "Forum", description: "Connect with other moms", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop", hasVideo: false },
  { id: "workshops", title: "Workshops and Classes", description: "Expert-led sessions", image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop", hasVideo: false },
];

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useAuth();

  const isGuest = state.isGuest;
  const isFree = state.role === "free";
  const isMember = state.role === "member" || state.role === "admin";
  
  let cards = GUEST_CARDS;
  if (isFree) {
    cards = FREE_CARDS;
  } else if (isMember) {
    cards = MEMBER_CARDS;
  }
  
  const userName = state.profile?.name || (isGuest ? "Guest" : state.session?.user?.email?.split('@')[0] || "there");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Logo size="medium" />
        </View>

        {isGuest && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome, {userName}! 👋</Text>
            <Text style={styles.welcomeDescription}>
              Browse our community forum. Sign up for free to post and comment, or become a member for full access to workshops and classes.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.memberButton, pressed && styles.memberButtonPressed]}
              onPress={() => router.push("/auth")}
            >
              <Text style={styles.memberButtonText}>Sign Up Free</Text>
            </Pressable>
          </View>
        )}

        {isFree && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome, {userName}! 👋</Text>
            <Text style={styles.welcomeDescription}>
              You have free access to the forum. Upgrade to member to unlock workshops and classes.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.memberButton, pressed && styles.memberButtonPressed]}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.memberButtonText}>Upgrade to Member</Text>
            </Pressable>
          </View>
        )}

        {isMember && (
          <Text style={styles.welcomeBackText}>Welcome back, {userName}!</Text>
        )}

        <View style={styles.cardsContainer}>
          {cards.map((card) => (
            <ContentCard
              key={card.id}
              card={card}
              onPress={() => {
                if (card.id === "forum" || card.id === "forums") router.push("/(tabs)/community");
                else if (card.id === "workshops") router.push("/(tabs)/schedule");
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 20 },
  welcomeBackText: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: colors.textPrimary, 
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  welcomeSection: {
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0E8DD",
  },
  welcomeText: { fontSize: 22, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
  welcomeDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  memberButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.primarySoft,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  memberButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: colors.primaryPressed,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 4,
  },
  memberButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  cardsContainer: { 
    gap: 16,
  },
  card: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.98 }] },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8E0D5",
    justifyContent: "center",
    alignItems: "center",
  },
  cardOverlay: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "rgba(255,255,255,0.95)",
    width: 50, 
    height: 50, 
    borderRadius: 25,
    justifyContent: "center", 
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: { alignItems: "center" },
  cardTitle: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#FFF", 
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)", 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 4,
    marginBottom: 4,
  },
  cardDescription: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.95)", 
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)", 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
  },
});
