import { useEffect, useState, useCallback } from "react";
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { supabase } from "../../lib/supabase";
import { useIsAdmin, useAuth, Role } from "../../contexts/AuthContext";
import EventForm from "../components/EventForm";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  instructor: string | null;
  location: string | null;
  image_url: string | null;
  price_qar: number | null;
  isBooked?: boolean;
};

function EventCard({
  event,
  role,
  onPress,
}: {
  event: EventRow;
  role: Role | null;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const isMemberOrAdmin = role === "member" || role === "admin";
  const isFreeMember = role === "free";
  const hasPrice =
    typeof event.price_qar === "number" && !Number.isNaN(event.price_qar);
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card, 
        event.isBooked && styles.cardBooked,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      {event.image_url && !imageError ? (
        <Image 
          source={{ uri: event.image_url }} 
          style={styles.cardImage} 
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          onError={(error) => {
            console.warn("Failed to load event image:", event.image_url, error);
            setImageError(true);
          }}
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="calendar-outline" size={48} color="#B8A99A" />
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          {event.isBooked && (
            <View style={styles.bookedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.bookedBadgeText}>Booked</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardMeta}>
          {new Date(event.starts_at).toLocaleString([], {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {event.instructor ? ` · ${event.instructor}` : ""}
        </Text>
        {hasPrice && (
          <Text style={styles.cardPrice}>
            {isFreeMember
              ? `Price: ${event.price_qar} QAR`
              : isMemberOrAdmin
              ? "Included in membership"
              : `Price: ${event.price_qar} QAR`}
          </Text>
        )}
        {event.location ? (
          <Text style={styles.cardLocation}>{event.location}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function EventsListScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { state } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchEvents = useCallback(async () => {
    // Fetch events with image_url and price
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, description, starts_at, instructor, location, image_url, price_qar")
      .order("starts_at", { ascending: true });
    
    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      setLoading(false);
      return;
    }

    // Fetch user's bookings if logged in
    let bookedEventIds = new Set<string>();
    if (state.session?.user?.id) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("event_id")
        .eq("user_id", state.session.user.id);
      
      if (!bookingsError && bookingsData) {
        bookedEventIds = new Set(bookingsData.map(b => b.event_id));
      }
    }

    // Map events with booking status
    const eventsWithBookingStatus = (eventsData ?? []).map(event => ({
      ...event,
      isBooked: bookedEventIds.has(event.id),
    }));

    setEvents(eventsWithBookingStatus);
    setLoading(false);
  }, [state.session?.user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const handleCreateEvent = async (data: {
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    instructor: string | null;
    location: string | null;
    image_url: string | null;
    price_qar: number | null;
  }) => {
    const { error } = await supabase.from("events").insert(data);
    if (error) {
      throw new Error(error.message || "Failed to create event");
    }
    // Refresh events list
    await fetchEvents();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {isAdmin && (
          <>
            <View style={styles.adminBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#5C4A4A" />
              <Text style={styles.adminBannerText}>Admin: You can manage events</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={() => setShowCreateForm(true)}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </Pressable>
          </>
        )}
        <View style={styles.centered}>
          <Text style={styles.empty}>No events yet.</Text>
          {isAdmin && (
            <Text style={styles.emptyHint}>Tap "Create Event" above to add your first event.</Text>
          )}
        </View>
        {isAdmin && (
          <EventForm
            visible={showCreateForm}
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleCreateEvent}
            isEditing={false}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isAdmin && (
        <>
          <View style={styles.adminBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#5C4A4A" />
            <Text style={styles.adminBannerText}>Admin: You can manage events</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => setShowCreateForm(true)}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </Pressable>
        </>
      )}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            role={state.role}
            onPress={() => router.push(`/events/${item.id}`)}
          />
        )}
      />
      {isAdmin && (
        <EventForm
          visible={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateEvent}
          isEditing={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#E8E0D5",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
  },
  adminBannerText: { fontSize: 14, color: "#5C4A4A", fontWeight: "500" },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#A8C6B6",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createButtonPressed: {
    opacity: 0.85,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBooked: {
    borderColor: "#A8C6B6",
    borderWidth: 2,
    backgroundColor: "#F8FDF9",
  },
  cardPressed: { opacity: 0.9 },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#E8E0D5",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#E8E0D5",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#5C4A4A",
    flex: 1,
    marginRight: 8,
  },
  bookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  cardMeta: { fontSize: 14, color: "#8B7355", marginTop: 4 },
  cardLocation: { fontSize: 13, color: "#B8A99A", marginTop: 4 },
  empty: { fontSize: 16, color: "#8B7355", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#B8A99A", textAlign: "center", marginTop: 8 },
});
