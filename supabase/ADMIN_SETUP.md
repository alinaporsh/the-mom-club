# Admin Role Setup Guide

## How to Make a User an Admin

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard → SQL Editor
2. Run this query to make a user an admin (replace the email):

```sql
-- Update user to admin role by email
UPDATE public.memberships 
SET role = 'admin', updated_at = NOW()
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'admin@example.com'
);
```

Or if you know the user's UUID:

```sql
-- Update user to admin role by UUID
UPDATE public.memberships 
SET role = 'admin', updated_at = NOW()
WHERE user_id = 'your-user-uuid-here';
```

### Option 2: Supabase Dashboard (Table Editor)

1. Go to Supabase Dashboard → Table Editor
2. Open the `memberships` table
3. Find the row for the user you want to promote
4. Click on the `role` field
5. Change from `free` or `member` to `admin`
6. Save the change

### Option 3: Create Admin During Signup

If the user doesn't have a membership record yet:

```sql
-- Insert admin membership for a user
INSERT INTO public.memberships (user_id, role)
VALUES (
  (SELECT id FROM public.profiles WHERE email = 'admin@example.com'),
  'admin'
)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin', updated_at = NOW();
```

## Verify Admin Status

Check if a user is an admin:

```sql
-- Check user's role
SELECT p.email, p.name, m.role, m.created_at
FROM public.profiles p
LEFT JOIN public.memberships m ON p.id = m.user_id
WHERE p.email = 'admin@example.com';
```

List all admins:

```sql
-- List all admin users
SELECT p.email, p.name, m.role, p.created_at
FROM public.profiles p
JOIN public.memberships m ON p.id = m.user_id
WHERE m.role = 'admin'
ORDER BY p.created_at DESC;
```

## Admin Capabilities

Admins have the following permissions via RLS policies:

### User Management
- ✅ View all user profiles
- ✅ Update any user profile (for support/moderation)
- ✅ View all memberships
- ✅ Update any user's role
- ✅ Create memberships for users

### Content Moderation
- ✅ Delete any forum post
- ✅ Edit any forum post
- ✅ Delete any forum comment
- ✅ Edit any forum comment

### Event Management
- ✅ Create events/classes
- ✅ Update any event
- ✅ Delete events

### Booking Management
- ✅ View all bookings
- ✅ Update any booking status
- ✅ Delete any booking
- ✅ Create bookings on behalf of users

## Security Notes

- ⚠️ **RLS policies enforce security at the database level** - UI checks are for UX only
- ⚠️ Admins cannot modify the `auth.users` table directly (Supabase restriction)
- ⚠️ Admin privileges are checked via the `get_my_role()` function
- ⚠️ All admin actions are logged with timestamps via the RLS policies

## Testing Admin Access

After promoting a user to admin:

1. Log out and log back in as the admin user
2. The role should be loaded in the AuthContext
3. Admin-only UI elements should appear
4. Test creating/editing/deleting content that non-admins cannot access
