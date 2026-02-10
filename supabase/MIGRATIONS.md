# Database Migrations Index

This document lists all database migrations in chronological order with descriptions of their purpose.

## Migration List

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial.sql` | Initial schema setup - Core tables (`profiles`, `events`, `classes`, `bookings`, `forum_posts`, `forum_comments`), RLS policies, triggers, and functions |
| 002 | `002_forum_allow_free.sql` | Allow free users to create forum posts and comments (relaxed RLS policies) |
| 003 | `003_admin_policies.sql` | Add admin-specific RLS policies for content moderation and event management |
| 004 | `004_add_profile_fields.sql` | Add `pregnancy_status`, `due_date`, and `baby_age` columns to `profiles` table |
| 005 | `005_fix_duplicate_signup.sql` | Fix duplicate profile creation issue during signup (handle race conditions) |
| 006 | `006_add_event_images.sql` | Add `image_url` column to `events` table for event thumbnails |
| 007 | `007_remove_duplicate_events.sql` | Data cleanup - Remove duplicate event entries from testing |
| 008 | `008_fix_event_times.sql` | Fix event time handling (ensure proper timezone support) |
| 009 | `009_add_event_prices_and_booking_policy.sql` | Add `price` column to events and update booking RLS policies for free/paid members |
| 010 | `010_add_email_exists_function.sql` | Create `email_exists()` PostgreSQL function for email validation during signup |
| 011 | `011_add_planning_status.sql` | Add `planning_status` enum to `profiles` (Trying, Pregnant, New Mom, Experienced Mom) |
| 012 | `012_add_event_category_and_audience.sql` | Add `category` (Prenatal/Postnatal/Both) and `audience` (text) columns to events |
| 013 | `013_add_event_attendance_mode.sql` | Add `attendance_mode` enum to events (In-Person, Online, Hybrid) |
| 014 | `014_forum_post_images_and_author_display.sql` | Add `image_url` column to `forum_posts` for optional post images |
| 015 | `015_forum_votes.sql` | Create `forum_post_votes` table for persistent voting (currently unused in MVP) |
| 016 | `016_forum_images_bucket_setup.sql` | Create Supabase Storage bucket and policies for forum images (currently unused in MVP) |
| 017 | `017_forum_post_tags.sql` | Add `tag` column to `forum_posts` for explicit tag selection (General, Newborn, Sleep, Feeding, Postpartum, Mental Health) |
| 018 | `018_forum_comment_images.sql` | Add `image_url` column to `forum_comments` for optional comment images (one per comment) |

---

## How to Run Migrations

### Option 1: Supabase Dashboard (SQL Editor)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order (001 → 018)
4. Execute each migration
5. Verify success in the SQL Editor history

### Option 2: Supabase CLI

1. Link your local project to Supabase:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Push all migrations:
   ```bash
   supabase db push
   ```

3. Or run migrations individually:
   ```bash
   supabase migration up
   ```

---

## Current Schema State

After running all 18 migrations, your database should have:

### Tables

- `profiles` - User profiles with pregnancy/motherhood status
- `events` - Classes and events with category, audience, price, attendance mode
- `bookings` - Event bookings with payment tracking
- `forum_posts` - Forum posts with tags and images
- `forum_comments` - Flat comments with optional images
- `forum_post_votes` - Vote tracking (created but unused in MVP)

### Storage Buckets

- `forum-images` - Bucket for forum images (created but unused in MVP)

### Functions

- `email_exists(email TEXT)` - Check if email is already registered

### RLS Policies

- Comprehensive Row Level Security on all tables
- Role-based access (Free, Member, Admin)
- Post/comment author permissions
- Admin moderation capabilities

---

## Migration Notes

### Soft-Deprecated Features

Some migrations create features that are not yet used in the current MVP:

- **`forum_post_votes` table** (015) - Created for future persistent voting, currently using local state
- **`forum-images` Storage bucket** (016) - Created for future cloud uploads, currently using local device URIs
- **`parent_comment_id` column** in `forum_comments` - Exists but unused (flat structure enforced)

These features are intentionally kept for future use and should not be removed.

### Breaking Changes

None of the current migrations are breaking changes. All add new columns/tables without removing existing functionality.

### Rollback

Migrations do not include rollback scripts. If you need to revert:

1. Restore from a database backup
2. Manually write and execute `DROP` statements
3. Or reset the entire database (only in development)

---

## Testing Migrations

After running migrations, verify:

1. **Tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Columns exist:**
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'forum_posts';
   ```

3. **RLS enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public';
   ```

4. **Functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public';
   ```

---

## Related Documentation

- `README.md` - Project setup and overview
- `the-mom-club/README.md` - App-specific setup instructions
- `docs/FORUM_FEATURE_GUIDE.md` - Forum feature documentation
- `docs/FUTURE_IMPROVEMENTS.md` - Planned enhancements

---

**Last Updated:** February 10, 2026  
**Total Migrations:** 18
