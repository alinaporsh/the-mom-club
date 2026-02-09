import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { supabase } from "../../lib/supabase";
import { useAuth, useIsAdmin } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";
import PaymentModal from "../components/PaymentModal";
import EventForm from "../components/EventForm";

type Event = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  instructor: string | null;
  location: string | null;
  image_url: string | null;
  price_qar: number | null;
};

async function fetchEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data;
}

async function checkBooking(eventId: string, userId: string): Promise<{ isBooked: boolean; bookingDate?: string }> {
  const { data, error } = await supabase
    .from("bookings")
    .select("created_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();
  
  if (error || !data) {
    return { isBooked: false };
  }
  
  return { 
    isBooked: true, 
    bookingDate: data.created_at 
  };
}

async function createBooking(args: { eventId: string; userId: string }) {
  const { error } = await supabase.from("bookings").insert({
    event_id: args.eventId,
    user_id: args.userId,
    status: "confirmed",
  });
  if (error) throw error;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventId = id ?? "";
  const { state } = useAuth();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [showClassPaymentModal, setShowClassPaymentModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  });

  const { data: bookingStatus, refetch: refetchBooking } = useQuery<{ isBooked: boolean; bookingDate?: string }>({
    queryKey: ["booking", eventId, state.session?.user?.id],
    queryFn: () => {
      if (!state.session?.user?.id || !eventId) return { isBooked: false };
      return checkBooking(eventId, state.session.user.id);
    },
    enabled: !!eventId && !!state.session?.user?.id,
  });

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async () => {
      // Refresh booking status
      await refetchBooking();
      // Invalidate events list to update booking badges
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      Alert.alert("Booked!", "Your spot is confirmed!");
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === "23505") {
        Alert.alert("Already booked", "You have already booked this event.");
        // Refresh booking status in case it was already booked
        refetchBooking();
      } else {
        Alert.alert("Error", err.message);
      }
    },
  });

  const role = state.role ?? "guest";
  const isMemberOrAdmin = role === "member" || role === "admin";
  const isFreeMember = role === "free";

  async function handlePaidBookingForFreeMember() {
    if (!event) {
      throw new Error("Event details are not available.");
    }
    if (!state.session?.user?.id || !eventId) {
      throw new Error("You must be signed in to book this event.");
    }

    try {
      await createBooking({ eventId, userId: state.session.user.id });
    } catch (err: any) {
      if (err?.code === "23505") {
        // Unique constraint: already booked
        await refetchBooking();
        throw new Error("You have already booked this event.");
      }
      throw err;
    }

    // Refresh booking status and events list
    await refetchBooking();
    queryClient.invalidateQueries({ queryKey: queryKeys.events });

    Alert.alert("Payment successful!", "Your class is booked.");
  }

  function handleBook() {
    if (!state.session?.user?.id || !eventId || state.isGuest) {
      Alert.alert("Sign in required", "You must be signed in to book.");
      return;
    }

    if (isMemberOrAdmin) {
      bookMutation.mutate({ eventId, userId: state.session.user.id });
      return;
    }

    if (isFreeMember) {
      if (!event || !event.price_qar) {
        Alert.alert(
          "Pricing unavailable",
          "This class is not yet available for payment. Please try again later."
        );
        return;
      }
      setShowClassPaymentModal(true);
      return;
    }

    Alert.alert("Upgrade required", "Only members can book events. Upgrade to book.");
  }

  async function handleUpdateEvent(data: {
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    instructor: string | null;
    location: string | null;
    image_url: string | null;
    price_qar: number | null;
  }) {
    const { error } = await supabase
      .from("events")
      .update(data)
      .eq("id", eventId);
    
    if (error) {
      throw new Error(error.message || "Failed to update event");
    }
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.events });
  }

  async function handleDeleteEvent() {
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${event?.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("events")
              .delete()
              .eq("id", eventId);
            
            if (error) {
              Alert.alert("Error", error.message || "Failed to delete event");
              return;
            }
            
            // Invalidate queries and navigate back
            queryClient.invalidateQueries({ queryKey: queryKeys.events });
            router.back();
          },
        },
      ]
    );
  }

  const booking = bookMutation.isPending;

  if (!eventId || isLoading || !event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  const isBooked = bookingStatus?.isBooked ?? false;
  const canBook = (!state.isGuest && (isMemberOrAdmin || isFreeMember));
  const price =
    event && typeof event.price_qar === "number" && !Number.isNaN(event.price_qar)
      ? event.price_qar
      : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#5C4A4A" />
        </Pressable>
        {isAdmin && (
          <View style={styles.adminActions}>
            <Pressable
              style={({ pressed }) => [styles.adminButton, pressed && styles.adminButtonPressed]}
              onPress={() => setShowEditForm(true)}
            >
              <Ionicons name="create-outline" size={20} color="#5C4A4A" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.adminButton, styles.deleteButton, pressed && styles.adminButtonPressed]}
              onPress={handleDeleteEvent}
            >
              <Ionicons name="trash-outline" size={20} color="#DC3545" />
            </Pressable>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {event.image_url && (
          <Image 
            source={{ uri: event.image_url }} 
            style={styles.heroImage} 
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        )}
        
        {isBooked && (
          <View style={styles.bookingBanner}>
            <View style={styles.bookingBannerContent}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.bookingBannerText}>
                <Text style={styles.bookingBannerTitle}>You're Booked!</Text>
                <Text style={styles.bookingBannerSubtitle}>
                  Your spot is confirmed for this event
                  {bookingStatus?.bookingDate && (
                    ` • Booked on ${new Date(bookingStatus.bookingDate).toLocaleDateString()}`
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {new Date(event.starts_at).toLocaleString([], {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {event.instructor ? ` · ${event.instructor}` : ""}
        </Text>
        {event.location ? (
          <Text style={styles.location}>{event.location}</Text>
        ) : null}
        {price !== null && (
          <Text style={styles.price}>
            {isFreeMember
              ? `Price: ${price} QAR per class`
              : isMemberOrAdmin
              ? "Included in your membership"
              : `Price: ${price} QAR`}
          </Text>
        )}
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.bookButton,
            isBooked && styles.bookButtonBooked,
            (!canBook || pressed || booking || isBooked) && styles.bookButtonDisabled,
          ]}
          onPress={handleBook}
          disabled={!canBook || booking || isBooked}
        >
          {booking ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <View style={styles.bookButtonContent}>
              {isBooked ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.bookButtonText}>Already Booked</Text>
                </>
              ) : (
                <Text style={styles.bookButtonText}>
                  {isBooked
                    ? "Already Booked"
                    : isFreeMember && price !== null
                    ? `Book for ${price} QAR`
                    : isMemberOrAdmin
                    ? "Book this event"
                    : "Upgrade to member to book"}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </ScrollView>
      {isFreeMember && price !== null && event && (
        <PaymentModal
          visible={showClassPaymentModal}
          onClose={() => setShowClassPaymentModal(false)}
          title="Class checkout"
          summaryTitle={event.title}
          summaryPrice={`${price} QAR`}
          summaryDescription="Single class access. Membership holders attend for free."
          primaryButtonLabel={`Pay ${price} QAR`}
          onConfirm={handlePaidBookingForFreeMember}
        />
      )}
      {isAdmin && event && (
        <EventForm
          visible={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSubmit={handleUpdateEvent}
          initialData={event}
          isEditing={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f2" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1, 
    borderBottomColor: "#E8E0D5",
    backgroundColor: "#fff7f2",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  backButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  adminActions: {
    flexDirection: "row",
    gap: 8,
  },
  adminButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F0EB",
  },
  deleteButton: {
    backgroundColor: "#FFE5E5",
  },
  adminButtonPressed: {
    opacity: 0.7,
  },
  scroll: { paddingBottom: 32 },
  heroImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#E8E0D5",
  },
  bookingBanner: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    margin: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bookingBannerText: {
    flex: 1,
  },
  bookingBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  bookingBannerSubtitle: {
    fontSize: 14,
    color: "#4CAF50",
    lineHeight: 20,
  },
  title: { 
    fontSize: 22, 
    fontWeight: "600", 
    color: "#5C4A4A",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  meta: { 
    fontSize: 15, 
    color: "#8B7355", 
    marginTop: 6,
    paddingHorizontal: 20,
  },
  location: { 
    fontSize: 14, 
    color: "#B8A99A", 
    marginTop: 4,
    paddingHorizontal: 20,
  },
  price: {
    fontSize: 15,
    color: "#8B7355",
    marginTop: 6,
    paddingHorizontal: 20,
    fontWeight: "500",
  },
  description: { 
    fontSize: 16, 
    color: "#5C4A4A", 
    lineHeight: 24, 
    marginTop: 16,
    paddingHorizontal: 20,
  },
  bookButton: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#A8C6B6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonBooked: {
    backgroundColor: "#4CAF50",
  },
  bookButtonDisabled: { 
    opacity: 0.7,
    shadowOpacity: 0.05,
  },
  bookButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookButtonText: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#FFF" 
  },
});
