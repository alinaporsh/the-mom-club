export const TAG_FILTERS = [
  "All",
  "General",
  "Newborn",
  "Sleep",
  "Feeding",
  "Postpartum",
  "Mental Health",
] as const;

export type ForumTagFilter = (typeof TAG_FILTERS)[number];

/** Tags available when creating a post (excludes "All") */
export const POST_TAGS = [
  "General",
  "Newborn",
  "Sleep",
  "Feeding",
  "Postpartum",
  "Mental Health",
] as const;

export type PostTag = (typeof POST_TAGS)[number];

/** Get tag for display: prefer stored tag, else infer from content */
export function getPostTag(post: { tag?: string | null; title?: string; body?: string }): string {
  if (post.tag && post.tag.trim()) return post.tag.trim();
  const inferred = inferTagsForPost(post.title ?? "", post.body ?? "")[0];
  return inferred ?? "General";
}

export function inferTagsForPost(title: string, body: string): string[] {
  const text = `${title} ${body}`.toLowerCase();
  const tags: string[] = [];

  if (text.includes("newborn") || text.includes("new baby") || text.includes("weeks old")) {
    tags.push("Newborn");
  }
  if (text.includes("sleep") || text.includes("nap") || text.includes("night") || text.includes("bedtime")) {
    tags.push("Sleep");
  }
  if (text.includes("feed") || text.includes("breast") || text.includes("bottle") || text.includes("formula")) {
    tags.push("Feeding");
  }
  if (text.includes("postpartum") || text.includes("post-partum") || text.includes("ppd")) {
    tags.push("Postpartum");
  }
  if (
    text.includes("mental") ||
    text.includes("anxiety") ||
    text.includes("overwhelmed") ||
    text.includes("stress")
  ) {
    tags.push("Mental Health");
  }

  // Ensure we always have at least one tag for display
  if (tags.length === 0) {
    tags.push("General");
  }

  // De-duplicate and cap the list
  return Array.from(new Set(tags));
}

