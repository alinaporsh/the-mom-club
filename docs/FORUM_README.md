# Forum Feature - Intentionally Flat Design

## Design Philosophy

The forum is **intentionally kept flat** for MVP simplicity, better moderation, and clearer user experience.

### Non-Negotiable Rules

1. **NO Subforums** - Single flat forum for all posts
2. **NO Subcategories** - Only top-level categories for filtering
3. **NO Threaded Replies** - Comments are one level only
4. **NO Reply-to-Reply** - Users comment on posts, not on other comments

### Structure

```
Forum Feed
  └─ Post Detail
      └─ Flat Comments (Post → Comments only)
```

### Why Flat?

- **Simpler moderation**: Easier to review all content at one level
- **Better mobile UX**: No complex threading on small screens
- **Faster development**: Less complexity in data model and UI
- **Clearer conversations**: Chronological order, no nested confusion

### Data Model

- `forum_posts`: Posts have explicit `tag` column (General, Newborn, Sleep, etc.) and optional `image_url` for device gallery images
- `forum_comments`: Comments have `post_id` only (no `parent_comment_id`) and optional `image_url` for one image per comment
- **Soft-deprecated fields**: Any `parent_comment_id` or nested reply fields are unused

### Features (MVP)

- ✅ Upvote/Downvote on posts (mocked, local state, inline footer layout)
- ✅ Device image picker for posts (expo-image-picker, local URIs)
- ✅ Device image picker for comments (one image per comment)
- ✅ Explicit tag selection (General, Newborn, Sleep, Feeding, Postpartum, Mental Health)
- ✅ Filter modal (event-style drawer with pills)
- ✅ Pull-to-refresh on feed
- ✅ Haptic feedback on interactions
- ✅ Skeleton loading states
- ✅ Full-width image previews (160px list, 240px detail)
- ❌ No comment voting
- ❌ No nested replies
- ❌ No subforums/subcategories

## Future Considerations

If threaded replies are needed post-MVP:
- Limit to 1 level of nesting max (Reddit-style)
- Require careful UX design for mobile
- Add moderation tools first
