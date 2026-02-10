import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { colors } from "../theme";

type EventFormData = {
  title: string;
  description: string;
  starts_at: string; // ISO datetime string
  ends_at: string; // ISO datetime string (optional)
  instructor: string;
  location: string;
  image_url: string;
  price_qar: string; // String for input, will be converted to number
  category: string;
  audience: "" | "pregnant" | "new_mom" | "planning";
  attendance_mode: "" | "online" | "in_person";
};

type EventFormProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<EventFormData, "price_qar"> & {
      price_qar: number | null;
      category: string | null;
      audience: "pregnant" | "new_mom" | "planning" | null;
      attendance_mode: "online" | "in_person" | null;
    }
  ) => Promise<void>;
  initialData?: {
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
  isEditing?: boolean;
};

export default function EventForm({
  visible,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    instructor: "",
    location: "",
    image_url: "",
    price_qar: "",
    category: "",
    audience: "",
    attendance_mode: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  // Initialize form when modal opens or initialData changes
  useEffect(() => {
    if (visible) {
      if (initialData && isEditing) {
        // Format datetime for input (YYYY-MM-DDTHH:mm)
        const formatDateTime = (isoString: string) => {
          const date = new Date(isoString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setFormData({
          title: initialData.title || "",
          description: initialData.description || "",
          starts_at: formatDateTime(initialData.starts_at),
          ends_at: initialData.ends_at ? formatDateTime(initialData.ends_at) : "",
          instructor: initialData.instructor || "",
          location: initialData.location || "",
          image_url: initialData.image_url || "",
          price_qar: initialData.price_qar !== null ? String(initialData.price_qar) : "",
          category: initialData.category || "",
          audience: initialData.audience ?? "",
          attendance_mode: initialData.attendance_mode ?? "",
        });
      } else {
        // Reset form for new event
        setFormData({
          title: "",
          description: "",
          starts_at: "",
          ends_at: "",
          instructor: "",
          location: "",
          image_url: "",
          price_qar: "",
          category: "",
          audience: "",
          attendance_mode: "",
        });
      }
    }
  }, [visible, initialData, isEditing]);

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission required",
            "We need access to your photos so you can upload an event image."
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName ?? `event-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    } catch (error) {
      console.warn("Image picker error", error);
      Alert.alert(
        "Image error",
        "We couldn't open your photo library. Please try again."
      );
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert("Title required", "Please enter an event title.");
      return;
    }

    if (!formData.starts_at.trim()) {
      Alert.alert("Start time required", "Please enter when the event starts.");
      return;
    }

    // Convert datetime-local to ISO string
    const startsAtISO = new Date(formData.starts_at).toISOString();
    const endsAtISO = formData.ends_at.trim()
      ? new Date(formData.ends_at).toISOString()
      : null;

    // Validate that end time is after start time if provided
    if (endsAtISO && new Date(endsAtISO) <= new Date(startsAtISO)) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }

    // Convert price to number or null
    const priceQar =
      formData.price_qar.trim() && !isNaN(Number(formData.price_qar))
        ? Number(formData.price_qar)
        : null;

    setLoading(true);
    try {
      // If an image was picked, upload it to Supabase storage and use its public URL.
      // Assumes an `event-images` bucket exists with public read access.
      let finalImageUrl: string | null =
        formData.image_url.trim() || null;

      if (selectedImage) {
        try {
          const fileExt =
            selectedImage.fileName.split(".").pop() || "jpg";
          const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${fileExt}`;
          const filePath = `events/${fileName}`;

          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("event-images")
              .upload(filePath, blob, {
                contentType: selectedImage.mimeType,
                upsert: true,
              });

          if (uploadError || !uploadData) {
            console.error("Image upload error", uploadError);
            throw uploadError;
          }

          const { data: publicUrlData } = supabase.storage
            .from("event-images")
            .getPublicUrl(uploadData.path);

          finalImageUrl = publicUrlData.publicUrl ?? null;
        } catch (uploadErr: any) {
          console.error("Image upload failed", uploadErr);
          
          // Check if it's a bucket error (bucket doesn't exist)
          const isBucketError = 
            uploadErr?.message?.includes("Bucket not found") ||
            uploadErr?.message?.includes("bucket") ||
            uploadErr?.statusCode === 404 ||
            uploadErr?.error === "Bucket not found";
          
          if (isBucketError) {
            // Show helpful message but allow continuing without image
            Alert.alert(
              "Storage bucket not configured",
              "The image storage bucket hasn't been set up yet. The event will be saved without an image. To enable image uploads, create a public 'event-images' bucket in Supabase Storage.",
              [
                {
                  text: "Continue without image",
                  style: "default",
                },
              ]
            );
            // Continue without image - finalImageUrl stays as formData.image_url or null
            finalImageUrl = formData.image_url.trim() || null;
          } else {
            // For other errors, warn but allow continuing
            Alert.alert(
              "Image upload failed",
              uploadErr?.message ??
                "We couldn't upload the event image. The event will be saved without an image.",
              [
                {
                  text: "Continue without image",
                  style: "default",
                },
              ]
            );
            // Continue without image
            finalImageUrl = formData.image_url.trim() || null;
          }
        }
      }

      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        starts_at: startsAtISO,
        ends_at: endsAtISO,
        instructor: formData.instructor.trim() || null,
        location: formData.location.trim() || null,
        image_url: finalImageUrl,
        price_qar: priceQar,
        category: formData.category.trim() || null,
        audience: formData.audience || null,
        attendance_mode: formData.attendance_mode || null,
      });
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            onPress={onClose}
            disabled={loading}
          >
            <Ionicons name="close" size={24} color="#5C4A4A" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Event" : "Create Event"}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor="#B8A99A"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Event description"
            placeholderTextColor="#B8A99A"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <Text style={styles.label}>Start Date & Time *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm"
            placeholderTextColor="#B8A99A"
            value={formData.starts_at}
            onChangeText={(text) => setFormData({ ...formData, starts_at: text })}
            editable={!loading}
          />
          <Text style={styles.hint}>
            Format: YYYY-MM-DDTHH:mm (e.g., 2025-12-25T14:00)
          </Text>

          <Text style={styles.label}>End Date & Time</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm (optional)"
            placeholderTextColor="#B8A99A"
            value={formData.ends_at}
            onChangeText={(text) => setFormData({ ...formData, ends_at: text })}
            editable={!loading}
          />
          <Text style={styles.hint}>
            Optional. Must be after start time.
          </Text>

          <Text style={styles.label}>Instructor</Text>
          <TextInput
            style={styles.input}
            placeholder="Instructor name"
            placeholderTextColor="#B8A99A"
            value={formData.instructor}
            onChangeText={(text) => setFormData({ ...formData, instructor: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Location (e.g., Online, Community Center)"
            placeholderTextColor="#B8A99A"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            editable={!loading}
          />

          <Text style={styles.label}>How is this hosted?</Text>
          <View style={styles.audienceRow}>
            <Pressable
              style={[
                styles.audiencePill,
                formData.attendance_mode === "" && styles.audiencePillActive,
              ]}
              onPress={() =>
                setFormData({
                  ...formData,
                  attendance_mode: "",
                })
              }
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.attendance_mode === "" && styles.audiencePillTextActive,
                ]}
              >
                Not set
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.audiencePill,
                formData.attendance_mode === "online" && styles.audiencePillActive,
              ]}
              onPress={() =>
                setFormData({
                  ...formData,
                  attendance_mode: "online",
                  location: formData.location || "Online",
                })
              }
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.attendance_mode === "online" && styles.audiencePillTextActive,
                ]}
              >
                Online
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.audiencePill,
                formData.attendance_mode === "in_person" && styles.audiencePillActive,
              ]}
              onPress={() =>
                setFormData({
                  ...formData,
                  attendance_mode: "in_person",
                })
              }
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.attendance_mode === "in_person" && styles.audiencePillTextActive,
                ]}
              >
                In person
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Image</Text>
          <View style={styles.imageUploadContainer}>
            {selectedImage || formData.image_url ? (
              <Image
                source={{
                  uri: selectedImage?.uri ?? formData.image_url,
                }}
                style={styles.imagePreview}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color="#B8A99A"
                />
                <Text style={styles.imagePlaceholderText}>
                  No image selected
                </Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.imageButton,
                pressed && styles.imageButtonPressed,
              ]}
              onPress={handlePickImage}
              disabled={loading}
            >
              <Text style={styles.imageButtonText}>
                {selectedImage || formData.image_url
                  ? "Change image"
                  : "Upload image"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Optional. Images are stored securely and shown on the event
            card.
          </Text>

          <Text style={styles.label}>Activity type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fitness, Nutrition, Support Circle"
            placeholderTextColor="#B8A99A"
            value={formData.category}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Who is this for?</Text>
          <View style={styles.audienceRow}>
            <Pressable
              style={[
                styles.audiencePill,
                formData.audience === "" && styles.audiencePillActive,
              ]}
              onPress={() => setFormData({ ...formData, audience: "" })}
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.audience === "" && styles.audiencePillTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.audiencePill,
                formData.audience === "pregnant" && styles.audiencePillActive,
              ]}
              onPress={() => setFormData({ ...formData, audience: "pregnant" })}
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.audience === "pregnant" && styles.audiencePillTextActive,
                ]}
              >
                Pregnant
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.audiencePill,
                formData.audience === "new_mom" && styles.audiencePillActive,
              ]}
              onPress={() => setFormData({ ...formData, audience: "new_mom" })}
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.audience === "new_mom" && styles.audiencePillTextActive,
                ]}
              >
                New Mom
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.audiencePill,
                formData.audience === "planning" && styles.audiencePillActive,
              ]}
              onPress={() => setFormData({ ...formData, audience: "planning" })}
              disabled={loading}
            >
              <Text
                style={[
                  styles.audiencePillText,
                  formData.audience === "planning" && styles.audiencePillTextActive,
                ]}
              >
                Planning
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Price (QAR)</Text>
          <TextInput
            style={styles.input}
            placeholder="Price in QAR (optional)"
            placeholderTextColor="#B8A99A"
            value={formData.price_qar}
            onChangeText={(text) => setFormData({ ...formData, price_qar: text })}
            keyboardType="decimal-pad"
            editable={!loading}
          />
          <Text style={styles.hint}>
            Optional. Leave empty for free events.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || loading) && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? "Save Changes" : "Create Event"}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D5",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeButtonPressed: {
    opacity: 0.6,
    backgroundColor: "#F5F0EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5C4A4A",
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5C4A4A",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#5C4A4A",
    borderWidth: 1,
    borderColor: "#E8E0D5",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: "#B8A99A",
    marginTop: 4,
    marginBottom: 8,
  },
  audienceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  audiencePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A8C6B6",
    backgroundColor: "#FFF",
  },
  audiencePillActive: {
    backgroundColor: "#A8C6B6",
    borderColor: "#A8C6B6",
  },
  audiencePillText: {
    fontSize: 14,
    color: "#8B7355",
    fontWeight: "500",
  },
  audiencePillTextActive: {
    color: "#FFF",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8E0D5",
    backgroundColor: colors.background,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.accentWarm,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accentWarm,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  imageUploadContainer: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 160,
    backgroundColor: "#E8E0D5",
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#F5F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#B8A99A",
  },
  imageButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  imageButtonPressed: {
    opacity: 0.9,
  },
  imageButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
