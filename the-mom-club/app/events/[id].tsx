import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { useAuth, useIsAdmin } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/queryClient";
import PaymentModal from "../components/PaymentModal";
import EventForm from "../components/EventForm";
import { colors } from "../theme";

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
  category: string | null;
  audience: "pregnant" | "new_mom" | "planning" | null;
  attendance_mode: "online" | "in_person" | null;
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(12));

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

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
    category: string | null;
    audience: "pregnant" | "new_mom" | "planning" | null;
    attendance_mode: "online" | "in_person" | null;
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
        <ActivityIndicator size="large" color={colors.textSecondary} />
      </View>
    );
  }

  const isBooked = bookingStatus?.isBooked ?? false;
  const price =
    event && typeof event.price_qar === "number" && !Number.isNaN(event.price_qar)
      ? event.price_qar
      : null;
  const priceLabel =
    price !== null
      ? isFreeMember
        ? `Price: ${price} QAR per class`
        : isMemberOrAdmin
        ? "Included in your membership"
        : `Price: ${price} QAR`
      : null;
  // Build tags to mirror the list cards, but show all instead of "+1".
  const detailTags: string[] = [];
  if (event.category && event.category.trim()) {
    detailTags.push(event.category.trim());
  }
  if (event.audience) {
    detailTags.push(
      event.audience === "pregnant"
        ? "Pregnant"
        : event.audience === "new_mom"
        ? "New Mom"
        : "Planning"
    );
  }
  const locLower = (event.location ?? "").toLowerCase();
  const isOnline =
    event.attendance_mode === "online" ||
    (!event.attendance_mode &&
      (locLower.includes("online") || locLower.includes("zoom") || locLower.includes("virtual")));
  if (event.location || event.attendance_mode) {
    detailTags.push(isOnline ? "Online" : "In person");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        {isAdmin && (
          <View style={styles.adminActions}>
            <Pressable
              style={({ pressed }) => [styles.adminButton, pressed && styles.adminButtonPressed]}
              onPress={() => setShowEditForm(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
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
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        style={{ opacity: fadeAnim, transform: [{ translateY }] }}
        showsVerticalScrollIndicator={false}
      >
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
        {detailTags.length > 0 && (
          <View style={styles.tagsRow}>
            {detailTags.map((label, index) => (
              <View
                key={`${label}-${index}`}
                style={index === 0 ? styles.tagPill : styles.audienceTagPill}
              >
                <Text
                  style={index === 0 ? styles.tagPillText : styles.audienceTagPillText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}
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
        {(event.location || priceLabel) && (
          <View style={styles.infoRow}>
            {event.location && (
              <View style={styles.infoChip}>
                <Ionicons
                  name={
                    event.attendance_mode === "online" ||
                    (event.location ?? "").toLowerCase().includes("online")
                      ? "wifi-outline"
                      : "location-outline"
                  }
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={styles.infoChipText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {event.location}
                </Text>
              </View>
            )}
            {priceLabel && (
              <View style={styles.infoChip}>
                <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                <Text
                  style={styles.infoChipText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {priceLabel}
                </Text>
              </View>
            )}
          </View>
        )}
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => {
            const disabled = booking || isBooked;
            return [
              styles.bookButton,
              isBooked && styles.bookButtonBooked,
              pressed && !disabled && styles.bookButtonPressed,
              disabled && styles.bookButtonDisabled,
            ];
          }}
          onPress={handleBook}
          disabled={booking || isBooked}
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
      </Animated.ScrollView>
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
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1, 
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.background,
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
    height: 260,
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
    fontSize: 24, 
    fontWeight: "700", 
    color: colors.textPrimary,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  meta: { 
    fontSize: 15, 
    color: colors.textSecondary, 
    marginTop: 6,
    paddingHorizontal: 20,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  tagPillText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  audienceTagPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFE4D6",
  },
  audienceTagPillText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxWidth: "100%",
  },
  infoChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  description: { 
    fontSize: 16, 
    color: colors.textPrimary, 
    lineHeight: 24, 
    marginTop: 18,
    paddingHorizontal: 20,
  },
  bookButton: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 30,
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
  bookButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  bookButtonDisabled: { 
    opacity: 0.6,
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
