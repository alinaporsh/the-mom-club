import { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Calendar, DateObject } from "react-native-calendars";
import { supabase } from "../../lib/supabase";
import { useIsAdmin, useAuth, Role } from "../../contexts/AuthContext";
import EventForm from "../components/EventForm";
import { colors } from "../theme";

type AttendanceMode = "online" | "in_person";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  instructor: string | null;
  location: string | null;
  image_url: string | null;
  price_qar: number | null;
  category: string | null;
  audience: "pregnant" | "new_mom" | "planning" | null;
  attendance_mode: "online" | "in_person" | null;
  isBooked?: boolean;
};

const getEffectiveAttendanceMode = (event: EventRow): AttendanceMode | null => {
  if (event.attendance_mode === "online" || event.attendance_mode === "in_person") {
    return event.attendance_mode;
  }
  const loc = (event.location ?? "").toLowerCase();
  if (!loc.trim()) return null;
  if (loc.includes("online") || loc.includes("zoom") || loc.includes("virtual")) {
    return "online";
  }
  return "in_person";
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
        pressed && styles.cardPressed,
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
        <CardTagsAndMeta event={event} isFreeMember={isFreeMember} isMemberOrAdmin={isMemberOrAdmin} />
      </View>
    </Pressable>
  );
}

type CardTagsAndMetaProps = {
  event: EventRow;
  isFreeMember: boolean;
  isMemberOrAdmin: boolean;
};

const CardTagsAndMeta = memo(function CardTagsAndMeta({
  event,
  isFreeMember,
  isMemberOrAdmin,
}: CardTagsAndMetaProps) {
  const tags: string[] = [];
  if (event.category && event.category.trim()) {
    tags.push(event.category.trim());
  }
  if (event.audience) {
    tags.push(
      event.audience === "pregnant"
        ? "Pregnant"
        : event.audience === "new_mom"
        ? "New Mom"
        : "Planning"
    );
  }

  const mode = getEffectiveAttendanceMode(event);
  if (mode === "online") {
    tags.push("Online");
  } else if (mode === "in_person") {
    tags.push("In person");
  }

  const visibleTags = tags.slice(0, 2);
  const extraCount = tags.length - visibleTags.length;

  const hasPrice =
    typeof event.price_qar === "number" && !Number.isNaN(event.price_qar);

  return (
    <View style={styles.cardInfoBlock}>
      {visibleTags.length > 0 && (
        <View style={styles.cardPillsRow}>
          {visibleTags.map((label, index) => (
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
          {extraCount > 0 && (
            <View style={styles.extraTagPill}>
              <Text style={styles.extraTagText}>{`+${extraCount}`}</Text>
            </View>
          )}
        </View>
      )}
      {(hasPrice || event.location) && (
        <View style={styles.cardMetaRow}>
          {hasPrice && (
            <View style={styles.cardMetaChip}>
              <Ionicons
                name="pricetag-outline"
                size={12}
                color={colors.textSecondary}
              />
              <Text
                style={styles.cardMetaChipText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isFreeMember
                  ? `Price: ${event.price_qar} QAR`
                  : isMemberOrAdmin
                  ? "Included in membership"
                  : `Price: ${event.price_qar} QAR`}
              </Text>
            </View>
          )}
          {event.location && (
            <View style={styles.cardMetaChip}>
              <Ionicons
                name={mode === "online" ? "wifi-outline" : "location-outline"}
                size={12}
                color={colors.textSecondary}
              />
              <Text
                style={styles.cardMetaChipText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {event.location}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export default function EventsListScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { state } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [dateFilter, setDateFilter] = useState<"upcoming" | "this_week" | "this_month" | "custom">("upcoming");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [audienceFilters, setAudienceFilters] = useState<Set<string>>(new Set());
  const [attendanceFilters, setAttendanceFilters] = useState<Set<AttendanceMode>>(new Set());
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarScale = useRef(new Animated.Value(0.95)).current;
  const filterSheetOpacity = useRef(new Animated.Value(0)).current;

  const isCustomRangeActive = dateFilter === "custom";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(calendarOpacity, {
        toValue: isCustomRangeActive ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(calendarScale, {
        toValue: isCustomRangeActive ? 1 : 0.97,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isCustomRangeActive, calendarOpacity, calendarScale]);

  useEffect(() => {
    if (showFilterDrawer) {
      filterSheetOpacity.setValue(0);
      Animated.timing(filterSheetOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      filterSheetOpacity.setValue(0);
    }
  }, [showFilterDrawer, filterSheetOpacity]);

  const toggleCategory = (cat: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  const toggleAudience = (aud: "pregnant" | "new_mom" | "planning") => {
    setAudienceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(aud)) next.delete(aud);
      else next.add(aud);
      return next;
    });
  };

  const toggleAttendance = (mode: AttendanceMode) => {
    setAttendanceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  };

  const handleDateFilterChange = (value: "upcoming" | "this_week" | "this_month" | "custom") => {
    Haptics.selectionAsync().catch(() => {});
    setDateFilter(value);
  };

  const handleCustomRangeDayPress = (day: DateObject) => {
    const date = day.dateString;

    Haptics.selectionAsync().catch(() => {});

    if (!customDateFrom || (customDateFrom && customDateTo)) {
      setCustomDateFrom(date);
      setCustomDateTo("");
      return;
    }

    if (customDateFrom && !customDateTo && date < customDateFrom) {
      setCustomDateFrom(date);
      setCustomDateTo("");
      return;
    }

    setCustomDateTo(date);
  };

  const buildMarkedDates = () => {
    if (!customDateFrom) return {};

    const marks: Record<string, any> = {};
    const start = customDateFrom;
    const end = customDateTo || customDateFrom;

    marks[start] = {
      startingDay: true,
      color: colors.primary,
      textColor: "#FFF",
    };
    marks[end] = {
      ...(marks[end] || {}),
      endingDay: true,
      color: colors.primary,
      textColor: "#FFF",
    };

    return marks;
  };

  const fetchEvents = useCallback(async () => {
    // Fetch events with image_url and price
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, description, starts_at, instructor, location, image_url, price_qar, category, audience, attendance_mode")
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
    category: string | null;
    audience: "pregnant" | "new_mom" | "planning" | null;
  }) => {
    const { error } = await supabase.from("events").insert(data);
    if (error) {
      throw new Error(error.message || "Failed to create event");
    }
    // Refresh events list
    await fetchEvents();
  };

  const now = new Date();

  const filteredEvents = events
    .filter((event) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(q) ||
        (event.description ?? "").toLowerCase().includes(q) ||
        (event.instructor ?? "").toLowerCase().includes(q)
      );
    })
    .filter((event) => {
      const start = new Date(event.starts_at);
      if (dateFilter === "upcoming") return start >= now;
      if (dateFilter === "this_week") {
        return start >= now && start <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      if (dateFilter === "this_month") {
        return (
          start.getFullYear() === now.getFullYear() &&
          start.getMonth() === now.getMonth() &&
          start >= now
        );
      }
      if (dateFilter === "custom" && customDateFrom && customDateTo) {
        const from = new Date(customDateFrom);
        const to = new Date(customDateTo);
        return start >= from && start <= to;
      }
      if (dateFilter === "custom") return true; // no range set yet
      return true;
    })
    .filter((event) => {
      if (categoryFilters.size === 0) return true;
      const cat = (event.category ?? "").toLowerCase();
      return Array.from(categoryFilters).some((c) => c.toLowerCase() === cat);
    })
    .filter((event) => {
      if (audienceFilters.size === 0) return true;
      if (!event.audience) return true; // general events visible to all
      return audienceFilters.has(event.audience);
    })
    .filter((event) => {
      if (attendanceFilters.size === 0) return true;
      const mode = getEffectiveAttendanceMode(event);
      if (!mode) return false;
      return attendanceFilters.has(mode);
    });

  const activeFilterCount =
    categoryFilters.size +
    audienceFilters.size +
    attendanceFilters.size +
    (dateFilter === "custom" && customDateFrom && customDateTo ? 1 : 0);

  if (loading) {
    // Simple skeleton loading state
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonSearch} />
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonCardImage} />
              <View style={styles.skeletonCardBody}>
                <View style={styles.skeletonLineLarge} />
                <View style={styles.skeletonLineSmall} />
                <View style={styles.skeletonTagRow}>
                  <View style={styles.skeletonTag} />
                  <View style={styles.skeletonTag} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {isAdmin && (
          <>
            <View style={styles.adminBanner}>
              <Ionicons name="shield-checkmark" size={16} color={colors.textPrimary} />
              <Text style={styles.adminBannerText}>Admin: You can manage events</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowCreateForm(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </Pressable>
          </>
        )}
        <View style={styles.centered}>
          <Text style={styles.empty}>No events match these filters.</Text>
          <Pressable
            style={({ pressed }) => [
              styles.clearFiltersButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => {
              setSearchQuery("");
              setDateFilter("upcoming");
              setCustomDateFrom("");
              setCustomDateTo("");
              setCategoryFilters(new Set());
              setAudienceFilters(new Set());
            }}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </Pressable>
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
            <Ionicons name="shield-checkmark" size={16} color={colors.textPrimary} />
            <Text style={styles.adminBannerText}>Admin: You can manage events</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowCreateForm(true);
            }}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </Pressable>
        </>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search classes"
          placeholderTextColor="#B8A99A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          style={({ pressed }) => [
            styles.filtersButton,
            pressed && styles.filtersButtonPressed,
            (categoryFilters.size > 0 || audienceFilters.size > 0 || dateFilter === "custom") &&
              styles.filtersButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setShowFilterDrawer(true);
          }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={
              categoryFilters.size > 0 ||
              audienceFilters.size > 0 ||
              attendanceFilters.size > 0 ||
              dateFilter === "custom"
                ? "#FFF"
                : colors.primary
            }
          />
          <Text
            style={[
              styles.filtersButtonText,
              (categoryFilters.size > 0 ||
                audienceFilters.size > 0 ||
                attendanceFilters.size > 0 ||
                dateFilter === "custom") &&
                styles.filtersButtonTextActive,
            ]}
          >
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showFilterDrawer}
        animationType={Platform.OS === "ios" ? "slide" : "slide"}
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterDrawer(false)}
      >
        <SafeAreaView style={styles.drawerContainer} edges={["top", "bottom"]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Filters</Text>
            <Pressable
              style={({ pressed }) => [styles.drawerCloseButton, pressed && styles.drawerClosePressed]}
              onPress={() => setShowFilterDrawer(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Animated.ScrollView
            style={[styles.drawerContent, { opacity: filterSheetOpacity }]}
            contentContainerStyle={styles.drawerScrollContent}
          >
            <Text style={styles.drawerSectionLabel}>Date</Text>
            <View style={styles.drawerPillsRow}>
              {(["upcoming", "this_week", "this_month", "custom"] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.drawerPill,
                    dateFilter === value && styles.drawerPillActive,
                  ]}
                  onPress={() => handleDateFilterChange(value)}
                >
                  <Text
                    style={[
                      styles.drawerPillText,
                      dateFilter === value && styles.drawerPillTextActive,
                    ]}
                  >
                    {value === "upcoming"
                      ? "Upcoming"
                      : value === "this_week"
                      ? "This week"
                      : value === "this_month"
                      ? "This month"
                      : "Custom range"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {dateFilter === "custom" && (
              <Animated.View
                style={[
                  styles.customCalendarContainer,
                  { opacity: calendarOpacity, transform: [{ scale: calendarScale }] },
                ]}
              >
                <Calendar
                  markingType="period"
                  onDayPress={handleCustomRangeDayPress}
                  markedDates={buildMarkedDates()}
                  theme={{
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: "#FFFFFF",
                    todayTextColor: colors.primary,
                    dayTextColor: colors.textPrimary,
                    monthTextColor: colors.textPrimary,
                    arrowColor: colors.primary,
                  }}
                />
                <Text style={styles.customDateSummary}>
                  {customDateFrom && customDateTo
                    ? `From ${customDateFrom} to ${customDateTo}`
                    : customDateFrom
                    ? `Start: ${customDateFrom} — select an end date`
                    : "Select a start and end date"}
                </Text>
              </Animated.View>
            )}

            <Text style={styles.drawerSectionLabel}>Event type</Text>
            <Text style={styles.drawerSectionHint}>Select one or more</Text>
            <View style={styles.drawerPillsRow}>
              {["Nutrition", "Fitness", "Support Circle", "Education"].map((cat) => {
                const selected = categoryFilters.has(cat);
                return (
                  <Pressable
                    key={cat}
                    style={[styles.drawerPill, selected && styles.drawerPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      toggleCategory(cat);
                    }}
                  >
                    <Text
                      style={[styles.drawerPillText, selected && styles.drawerPillTextActive]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
              {Array.from(
                new Set(
                  events
                    .map((e) => e.category?.trim())
                    .filter(
                      (c): c is string =>
                        !!c &&
                        !["Nutrition", "Fitness", "Support Circle", "Education"].includes(c)
                    )
                )
              ).map((cat) => {
                const selected = categoryFilters.has(cat);
                return (
                  <Pressable
                    key={cat}
                    style={[styles.drawerPill, selected && styles.drawerPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      toggleCategory(cat);
                    }}
                  >
                    <Text
                      style={[styles.drawerPillText, selected && styles.drawerPillTextActive]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.drawerSectionLabel}>Audience</Text>
            <Text style={styles.drawerSectionHint}>Select one or more</Text>
            <View style={styles.drawerPillsRow}>
              {(["pregnant", "new_mom", "planning"] as const).map((aud) => {
                const selected = audienceFilters.has(aud);
                return (
                  <Pressable
                    key={aud}
                    style={[styles.drawerPill, selected && styles.drawerPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      toggleAudience(aud);
                    }}
                  >
                    <Text
                      style={[styles.drawerPillText, selected && styles.drawerPillTextActive]}
                    >
                      {aud === "pregnant"
                        ? "Pregnant"
                        : aud === "new_mom"
                        ? "New Mom"
                        : "Planning"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.drawerSectionLabel}>Format</Text>
            <Text style={styles.drawerSectionHint}>How you'll attend</Text>
            <View style={styles.drawerPillsRow}>
              {(["online", "in_person"] as const).map((mode) => {
                const selected = attendanceFilters.has(mode);
                return (
                  <Pressable
                    key={mode}
                    style={[styles.drawerPill, selected && styles.drawerPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      toggleAttendance(mode);
                    }}
                  >
                    <Text
                      style={[
                        styles.drawerPillText,
                        selected && styles.drawerPillTextActive,
                      ]}
                    >
                      {mode === "online" ? "Online" : "In person"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({ pressed }) => [styles.drawerClearButton, pressed && styles.drawerClearPressed]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setDateFilter("upcoming");
                setCustomDateFrom("");
                setCustomDateTo("");
                setCategoryFilters(new Set());
                setAudienceFilters(new Set());
                setAttendanceFilters(new Set());
              }}
            >
              <Text style={styles.drawerClearText}>Clear all filters</Text>
            </Pressable>
          </Animated.ScrollView>
          <View style={styles.drawerFooter}>
            <Pressable
              style={({ pressed }) => [styles.drawerApplyButton, pressed && styles.drawerApplyPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowFilterDrawer(false);
              }}
            >
              <Text style={styles.drawerApplyText}>Apply</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            role={state.role}
            onPress={() => router.push(`/events/${item.id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
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
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  skeletonHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  skeletonSearch: {
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E0D5",
  },
  skeletonCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    marginBottom: 16,
    marginHorizontal: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  skeletonCardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#E8E0D5",
  },
  skeletonCardBody: {
    padding: 12,
  },
  skeletonLineLarge: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E8E0D5",
    marginBottom: 8,
    width: "70%",
  },
  skeletonLineSmall: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E8E0D5",
    width: "50%",
  },
  skeletonTagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  skeletonTag: {
    height: 20,
    flex: 0.3,
    borderRadius: 999,
    backgroundColor: "#E8E0D5",
  },
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
  adminBannerText: { fontSize: 14, color: colors.textPrimary, fontWeight: "500" },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
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
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    marginBottom: 16,
    marginHorizontal: 4,
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
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.98 }],
  },
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
    padding: 12,
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
    color: colors.textPrimary,
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
  cardMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  cardInfoBlock: {
    marginTop: 8,
  },
  cardPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    maxWidth: "100%",
  },
  tagPill: {
    maxWidth: "60%",
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E8F0ED",
  },
  tagPillText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  audienceTagPill: {
    maxWidth: "40%",
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFF1EB",
  },
  audienceTagPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  extraTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  extraTagText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  cardMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardMetaChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 130,
  },
  cardLocation: { fontSize: 13, color: "#B8A99A", marginTop: 4 },
  empty: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#B8A99A", textAlign: "center", marginTop: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filtersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFF",
  },
  filtersButtonPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  filtersButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtersButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  filtersButtonTextActive: {
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
  drawerClosePressed: { opacity: 0.6, backgroundColor: "#F5F0EB" },
  drawerContent: { flex: 1 },
  drawerScrollContent: { padding: 20, paddingBottom: 24 },
  drawerSectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  drawerSectionHint: {
    fontSize: 13,
    color: "#B8A99A",
    marginBottom: 10,
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
  customCalendarContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  customDateSummary: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  drawerClearButton: {
    marginTop: 28,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  drawerClearPressed: { opacity: 0.7 },
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
  drawerApplyPressed: { opacity: 0.9 },
  drawerApplyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  clearFiltersButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
