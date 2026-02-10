# Community Forum - Complete Feature Guide

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Current Features](#current-features)
4. [User Interface](#user-interface)
5. [Image Support](#image-support)
6. [Tag System](#tag-system)
7. [Voting System](#voting-system)
8. [Interactive Features](#interactive-features)
9. [Data Model](#data-model)
10. [Testing Guide](#testing-guide)
11. [Known Limitations](#known-limitations)
12. [Future Enhancements](#future-enhancements)

---

## Overview

The Community Forum is a **flat, Reddit-style discussion platform** designed for mothers to share experiences, ask questions, and connect with each other. The forum prioritizes simplicity, clear moderation, and mobile-first UX.

**Key Characteristics:**
- Single flat forum (no subforums)
- One-level comments only (no threaded replies)
- Tag-based organization
- Device image picker for posts and comments
- Mocked voting system (local state)
- Pull-to-refresh and haptic feedback
- Event-style filter modal

---

## Design Philosophy

### Non-Negotiable Rules

1. **NO Subforums** - Single flat forum for all posts
2. **NO Subcategories** - Only top-level tags for filtering
3. **NO Threaded Replies** - Comments are one level only
4. **NO Reply-to-Reply** - Users comment on posts, not on other comments

### Why Flat?

- **Simpler moderation**: Easier to review all content at one level
- **Better mobile UX**: No complex threading on small screens
- **Faster development**: Less complexity in data model and UI
- **Clearer conversations**: Chronological order, no nested confusion

### Structure

```
Forum Feed
  └─ Post Detail
      └─ Flat Comments (Post → Comments only)
```

---

## Current Features

### ✅ Implemented (MVP)

- **Upvote/Downvote on posts** - Mocked, local state, inline footer layout
- **Device image picker for posts** - expo-image-picker, local URIs stored in database
- **Device image picker for comments** - One image per comment, local URIs
- **Explicit tag selection** - General, Newborn, Sleep, Feeding, Postpartum, Mental Health
- **Filter modal** - Event-style drawer with pill buttons
- **Pull-to-refresh** - RefreshControl on forum feed
- **Haptic feedback** - Tactile feedback on votes, taps, filter selection, comment submit
- **Skeleton loading states** - 4 placeholder cards instead of spinner
- **Full-width image previews** - 160px in list view, 240px in detail view
- **Flat comment list** - Chronological, one-level only

### ❌ Not Implemented

- No comment voting
- No nested replies
- No subforums/subcategories
- No persistent voting (votes stored locally only)
- No Supabase Storage uploads (using local URIs)
- No rich text editor
- No @mentions
- No search functionality

---

## User Interface

### Design Principles (MVP Polish)

To improve perceived quality while staying within MVP scope, we focused on UI clarity and readability without adding new features:

- **Improved post card hierarchy**: Titles are emphasized (18px, darker color), body text is secondary (13px, lighter), and metadata (author/date) is muted (11px) for faster scanning.
- **Cleaner image presentation**: Full-width image previews (160px in feed, 240px in detail) render consistently. Missing/broken images fail gracefully without breaking post creation or feed rendering.
- **Refined voting layout**: Upvote/downvote controls are compact (14-16px icons) and visually secondary (reduced opacity), positioned inline with metadata to avoid distracting from content on mobile.
- **Consistent spacing and layout**: Cards have consistent padding (16-18px) and separation (10px margins) to make the feed feel more "production-ready."

### Forum Feed (`app/(tabs)/community.tsx`)

**Layout:**
- Header with "New Post" button
- Filter button (shows active state when filter applied)
- Scrollable feed with pull-to-refresh
- Skeleton loaders while fetching

**Post Card Structure:**
1. Category tag (10px, uppercase, letter-spaced, muted color)
2. Post title (18px, bold, dark #3D3230 for emphasis)
3. Body preview (13px, 3 lines max, secondary color #8B7355)
4. Full-width image preview (160px height, 8px border radius) if image exists
5. Footer row: author name (11px, muted #B8A99A) · timestamp · voting controls (80% opacity)

**Visual Hierarchy Improvements:**
- Titles are 12.5% larger and darker than before for better scan-ability
- Body text is 7% smaller and lighter to be visually secondary
- Metadata is smallest and most muted (tertiary importance)
- Vote icons reduced by 12.5% to be less dominant

**Voting Controls:**
- Inline in footer (not vertical left column)
- Up arrow · score · down arrow
- Subtle colors (muted inactive state #C4B5A5)
- Small size (14px icons, 11px score text)
- Reduced opacity (0.8 in feed, 0.85 in detail)
- Haptic feedback on tap

### Post Detail (`app/forum/[id].tsx`)

**Layout:**
1. Back button with haptic feedback
2. Category tag (10px, letter-spaced, uppercase)
3. Post title (22px, bold, dark #3D3230, line-height 30px)
4. Author · timestamp metadata (12px, muted color)
5. Post body (15px for optimal readability, well-spaced)
6. Full-width image (240px height, 8px border radius) if image exists
7. Voting controls (inline, 85% opacity, subtle colors)
8. Flat comments section (chronological)
9. Comment input (bottom, with image picker)

**Visual Polish:**
- Title is 10% larger than feed view (22px vs 18px)
- Body text is optimized for reading (15px vs 13px in feed)
- Consistent spacing: 18px padding on post content
- Vote controls subtle but accessible (16px icons)
- Clean separation between content sections

**Comment Structure:**
- Author name (bold)
- Timestamp
- Comment body
- Comment image (if exists)
- No reply button
- No indentation

### New Post Screen (`app/forum/new.tsx`)

**Form Fields:**
1. Title input
2. Body input (multiline)
3. Category selector (horizontal pill buttons)
4. Image picker button (dashed border)
   - Shows image preview when selected
   - Remove button to clear image
5. Submit button

---

## Image Support

### Implementation Details

**Technology:**
- `expo-image-picker` for device gallery access
- Local device URIs stored in database (no cloud upload)
- Graceful permission handling

**User Flow:**
1. User taps "Add image from gallery" button
2. System requests media library permission
3. If granted: Image picker opens
4. User selects image
5. Preview shows with remove button
6. On submit: Local URI saved to `image_url` column

**Error Handling:**
- Permission denied → Allow posting without image
- Image picker cancelled → No error, continue
- Image load failure → Silent fallback, no crash
- Missing image column in DB → Query without it (backward compatible)

**Storage Strategy (MVP):**
- Images NOT uploaded to Supabase Storage
- Local device URIs stored temporarily
- Works for demo/testing purposes
- **Future**: Replace with real Supabase Storage uploads

### Posts

- One image per post
- Preview in feed: 160px height, full width
- Preview in detail: 240px height, full width
- Aspect ratio preserved
- Max height enforced

### Comments

- One image per comment
- Rendered below comment body
- Same styling as post images
- Optional (not required)

---

## Tag System

### Available Tags

- **General** (default)
- **Newborn**
- **Sleep**
- **Feeding**
- **Postpartum**
- **Mental Health**

### Tag Selection

**When Creating Post:**
- Horizontal pill-style buttons
- Default: "General"
- Single selection
- Stored in `forum_posts.tag` column

**Filtering:**
- Event-style modal drawer (iOS pageSheet)
- Header with title and close button
- Pill-style tag options
- "Clear filters" button
- "Apply" button to confirm
- Active filter shows on main filter button

### Tag Priority

1. If post has explicit `tag` column value → use it
2. Else fall back to `inferTagsForPost()` (keyword matching)
3. If no match → default to "General"

**Helper Function:**
```typescript
getPostTag(post: { tag?: string | null; title?: string; body?: string }): string
```

---

## Voting System

### Current Implementation (Mocked)

**Storage:**
- Local state only (`useState` map)
- Format: `{ [postId]: { score: number, userVote: 1 | -1 | 0 } }`

**Behavior:**
- Tap up arrow → +1 vote (score increases by 1)
- Tap down arrow → -1 vote (score decreases by 1)
- Tap same arrow again → remove vote (score reverts)
- Tap opposite arrow → switch vote (score changes by ±2)

**UI:**
- Orange color for upvote/positive score
- Blue color for downvote/negative score
- Filled icon when voted, outline when not
- Haptic feedback on tap

**Limitations:**
- Votes not persisted to database
- Resets on app restart
- No per-user vote tracking
- No uniqueness enforcement

**Future:**
- Use `forum_post_votes` table (already created in migration 015)
- Implement RLS for vote uniqueness
- Sync vote counts to `forum_posts.vote_score` column

---

## Interactive Features

### Pull-to-Refresh

**Implementation:**
- `RefreshControl` component on `FlatList`
- Triggers `refetch()` from React Query
- Shows native spinner while refreshing
- Works on forum feed only (not post detail)

### Haptic Feedback

**Triggered On:**
- Back button press
- New post button tap
- Filter button tap
- Filter pill selection
- Vote button press
- Post card tap
- Comment submit button

**Haptic Type:**
- `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

### Skeleton Loaders

**When Shown:**
- Initial forum feed load (`isLoading === true`)
- Not shown on refresh (shows RefreshControl instead)

**Design:**
- 4 placeholder cards
- Gray background with subtle shimmer
- Same dimensions as real post cards
- Matches card border radius and spacing

---

## Data Model

### Tables

#### `forum_posts`

| Column       | Type      | Description                                |
|--------------|-----------|--------------------------------------------|
| `id`         | UUID      | Primary key                                |
| `title`      | TEXT      | Post title                                 |
| `body`       | TEXT      | Post content                               |
| `author_id`  | UUID      | Foreign key to `profiles`                  |
| `created_at` | TIMESTAMP | Auto-generated                             |
| `image_url`  | TEXT      | Local device URI or null (added in 014)    |
| `tag`        | TEXT      | Explicit tag (General, Newborn, etc.) (017)|

#### `forum_comments`

| Column       | Type      | Description                                |
|--------------|-----------|--------------------------------------------|
| `id`         | UUID      | Primary key                                |
| `post_id`    | UUID      | Foreign key to `forum_posts`               |
| `author_id`  | UUID      | Foreign key to `profiles`                  |
| `body`       | TEXT      | Comment content                            |
| `created_at` | TIMESTAMP | Auto-generated                             |
| `image_url`  | TEXT      | Local device URI or null (added in 018)    |

**Note:** `parent_comment_id` column exists but is **unused** (soft-deprecated).

#### `forum_post_votes` (created but unused)

| Column       | Type      | Description                                |
|--------------|-----------|--------------------------------------------|
| `id`         | UUID      | Primary key                                |
| `post_id`    | UUID      | Foreign key to `forum_posts`               |
| `user_id`    | UUID      | Foreign key to `profiles`                  |
| `vote`       | INTEGER   | 1 for upvote, -1 for downvote              |
| `created_at` | TIMESTAMP | Auto-generated                             |

### Row Level Security (RLS)

**forum_posts:**
- `SELECT`: All authenticated users
- `INSERT`: Free, Member, Admin only
- `DELETE`: Admins or post author only

**forum_comments:**
- `SELECT`: All authenticated users
- `INSERT`: Free, Member, Admin only
- `DELETE`: Admins or comment author only

### Migrations

- `014_add_forum_images.sql` - Added `image_url` to `forum_posts`
- `017_forum_post_tags.sql` - Added `tag` column to `forum_posts`
- `018_forum_comment_images.sql` - Added `image_url` to `forum_comments`

---

## Testing Guide

### Test Case 1: Create Post Without Image

1. Navigate to Forum tab
2. Tap "New Post" button
3. Enter title: "Test Post"
4. Enter body: "This is a test"
5. Select tag: "General"
6. **Do NOT** add image
7. Tap "Post"

**Expected:**
- Redirects to post detail
- Post shows with selected tag
- No image placeholder
- Comment input visible at bottom

### Test Case 2: Create Post With Image

1. Navigate to Forum tab
2. Tap "New Post" button
3. Enter title: "Test with Image"
4. Enter body: "Testing image picker"
5. Select tag: "Newborn"
6. Tap "Add image from gallery"
7. Grant permission (if prompted)
8. Select an image
9. **Expected:** Image preview shows
10. Tap "Post"

**Expected:**
- Redirects to post detail
- Full 240px image renders above footer
- Image aspect ratio preserved
- Tag shows "NEWBORN"

### Test Case 3: Remove Image Before Posting

1. Follow steps 1-8 from Test Case 2
2. Tap "Remove" button on image preview
3. **Expected:** Preview disappears, "Add image" button returns
4. Tap "Post"

**Expected:**
- Post created without image
- No errors

### Test Case 4: Deny Photo Permission

1. Settings → The Mom Club → Photos → Select "None"
2. Navigate to Forum → New Post
3. Tap "Add image from gallery"
4. **Expected:** Permission denied, no crash
5. Enter title and body
6. Tap "Post"

**Expected:**
- Post still created successfully
- No image attached

### Test Case 5: Filter Posts by Tag

1. Navigate to Forum tab
2. Create posts with different tags
3. Tap "Filter" button
4. **Expected:** Event-style modal appears
5. Select "Sleep" pill
6. Tap "Apply"

**Expected:**
- Modal closes
- Filter button shows "SLEEP" or active state
- Only posts with Sleep tag visible

### Test Case 6: Add Comment With Image

1. Open any post detail
2. Scroll to bottom comment input
3. Tap "Add image" button (dashed border)
4. Select image from gallery
5. **Expected:** Image preview shows
6. Enter comment text: "Test comment with image"
7. Tap "Post comment"

**Expected:**
- Comment appears in flat list
- Image renders below comment body
- Author name and timestamp visible
- No reply button

### Test Case 7: Vote on Post

1. View any post in feed
2. Tap up arrow in footer
3. **Expected:**
   - Haptic feedback
   - Arrow fills with orange
   - Score increases by 1
4. Tap up arrow again
5. **Expected:**
   - Haptic feedback
   - Arrow becomes outline
   - Score returns to 0
6. Tap down arrow
7. **Expected:**
   - Haptic feedback
   - Arrow fills with blue
   - Score shows -1

### Test Case 8: Pull to Refresh

1. Navigate to Forum feed
2. Pull down from top
3. **Expected:** Native refresh spinner appears
4. Release
5. **Expected:**
   - Feed reloads
   - Latest posts appear at top
   - Spinner disappears

### Test Case 9: Skeleton Loading

1. Clear app cache/data
2. Navigate to Forum tab
3. **Expected while loading:**
   - 4 gray skeleton cards visible
   - No spinner
   - Smooth transition to real posts

---

## Known Limitations

### MVP Scope

1. **Voting not persisted** - All votes stored in local state only, reset on app restart
2. **Images not uploaded** - Local URIs stored, not actual Supabase Storage uploads
3. **No comment voting** - Only posts have voting UI
4. **No search** - Cannot search posts by keyword
5. **No sorting** - Posts always show newest first
6. **No @mentions** - Cannot tag other users
7. **No rich text** - Plain text only, no bold/italic/links

### Technical Debt

1. **Backward compatibility checks** - Code includes fallbacks for missing `tag`/`image_url` columns (error code `42703`)
2. **Vote counts not aggregated** - No server-side vote totals
3. **Image URIs may break** - Local URIs may become invalid if user deletes photos from device
4. **No image moderation** - Admins cannot flag/remove inappropriate images easily

---

## Future Enhancements

### What We Would Improve with +1 Week

1. **Supabase Storage Integration** (High Priority)
   - Persist images using Supabase Storage with proper RLS policies (instead of mocked rendering)
   - Upload images to `forum-images` bucket
   - Generate public URLs
   - Thumbnail generation for feed view
   - Image size limits and compression

2. **Persistent Voting** (High Priority)
   - Persist vote integrity using a `post_votes` table (one vote per user, toggle behavior)
   - Use `forum_post_votes` table
   - Implement vote uniqueness (one vote per user per post)
   - Aggregate vote counts to `forum_posts.vote_score`
   - Real-time vote updates

3. **Comment Count & Sorting** (High Priority)
   - Add comment count on feed cards
   - Basic sorting (New/Top) once engagement data is available

4. **Search Functionality** (Medium Priority)
   - Full-text search using PostgreSQL `tsvector`
   - Search by title, body, author name
   - Filter by tag + search term

### Medium Priority

4. **Comment Voting**
   - Similar UI to post voting
   - Separate `forum_comment_votes` table
   - Sort comments by vote score

5. **Sorting Options**
   - Newest (default)
   - Most voted
   - Most commented

6. **Save/Bookmark Posts**
   - `saved_posts` table
   - "Save" button in post detail
   - Saved posts list in profile

### Low Priority

7. **Rich Text Editor**
   - Bold, italic, lists, links
   - Markdown support
   - Preview mode

8. **@Mention System**
   - Tag other users in comments
   - Send notification to mentioned user
   - Autocomplete username picker

9. **Post Analytics**
   - View count tracking
   - Engagement metrics
   - Popular posts section

---

## Related Documentation

- `docs/FORUM_README.md` - Design philosophy and flat structure
- `docs/FORUM_UI_POLISH.md` - Latest UI refinements and MVP polish details
- `docs/FORUM_IMAGE_SUPPORT.md` - Image picker implementation details
- `docs/FORUM_UI_REFINEMENT.md` - Voting UI repositioning
- `docs/FUTURE_IMPROVEMENTS.md` - Full feature roadmap
- `supabase/MIGRATIONS.md` - Database migration index

---

**Last Updated:** February 10, 2026  
**Current Version:** MVP with tags, images, and interactive UI
