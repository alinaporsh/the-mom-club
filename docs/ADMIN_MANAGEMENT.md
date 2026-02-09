# The Mom Club - Admin Management Guide

## Overview

This guide provides comprehensive instructions for managing administrator accounts in The Mom Club application. Admins have elevated privileges to manage content, users, events, and bookings across the platform.

**Target Audience**: System administrators, project managers, and technical staff responsible for platform moderation and management.

---

## Table of Contents

- [Admin Role Capabilities](#admin-role-capabilities)
- [How to Add an Admin User](#how-to-add-an-admin-user)
- [Verifying Admin Access](#verifying-admin-access)
- [Admin Security Best Practices](#admin-security-best-practices)
- [Removing Admin Access](#removing-admin-access)
- [Role Comparison Table](#role-comparison-table)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Admin Role Capabilities

Administrators have the following elevated permissions enforced at the database level through Row Level Security (RLS) policies:

### Content Moderation
- **Delete any forum post**: Remove inappropriate or policy-violating posts
- **Delete any forum comment**: Moderate comment sections
- **Edit any post or comment**: Fix errors or remove problematic content
- **View all content**: Access to all posts and comments regardless of author

### Event Management
- **Create events/classes**: Add new workshops, classes, and events
- **Update any event**: Modify event details, times, instructors, pricing
- **Delete events**: Remove canceled or completed events
- **View all bookings**: See who has booked each event

### User Management
- **View all user profiles**: Access to complete user directory
- **Update user roles**: Promote/demote users between guest, free, member, admin
- **View all memberships**: Monitor membership distribution and status
- **Update membership records**: Modify user access levels as needed

### Booking Management
- **View all bookings**: Complete visibility into event registrations
- **Create bookings**: Register users for events manually
- **Update booking status**: Modify or cancel bookings
- **Delete bookings**: Remove bookings as needed

### Admin-Only UI Features
- **Event creation form**: "Add Event" button in Schedule tab
- **Delete buttons**: On posts, comments, and events
- **Edit capabilities**: For all content regardless of ownership
- **Admin indicators**: Special UI elements showing admin status

---

## How to Add an Admin User

### Prerequisites

Before creating an admin user:
1. **User must exist**: The user must have already signed up and completed onboarding
2. **Profile created**: User should have a record in the `profiles` table
3. **Supabase access**: You need access to the Supabase project dashboard or SQL editor

### Method 1: Via Supabase SQL Editor (Recommended)

This is the most reliable method for creating admin users.

**Step 1**: Access the SQL Editor
1. Go to your Supabase Dashboard at [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

**Step 2**: Run the update query

**If you know the user's email:**

```sql
-- Update user to admin role by email
UPDATE public.memberships 
SET role = 'admin', 
    updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM public.profiles 
  WHERE email = 'admin@example.com'
);
```

**If you know the user's UUID:**

```sql
-- Update user to admin role by UUID
UPDATE public.memberships 
SET role = 'admin', 
    updated_at = NOW()
WHERE user_id = 'your-user-uuid-here';
```

**Step 3**: Verify the update

```sql
-- Verify the role was updated
SELECT p.email, p.name, m.role, m.updated_at
FROM public.profiles p
JOIN public.memberships m ON p.id = m.user_id
WHERE p.email = 'admin@example.com';
```

You should see `role: 'admin'` in the results.

---

### Method 2: Via Supabase Dashboard (Table Editor)

This method provides a visual interface for updating roles.

**Step 1**: Navigate to Table Editor
1. Go to your Supabase Dashboard
2. Click **Table Editor** in the left sidebar
3. Select the **memberships** table

**Step 2**: Find the user
1. Use the search/filter to find the user by their UUID
2. Or scroll through the list to find the correct user

**Step 3**: Update the role
1. Click on the **role** field for that user
2. Change the value from `free` or `member` to `admin`
3. Press Enter or click outside the field to save
4. The `updated_at` timestamp will update automatically

**Step 4**: Verify in the app
1. Have the user log out and log back in
2. Admin features should now be visible

---

### Method 3: For First-Time Setup (User Without Membership)

If a user has signed up but doesn't have a membership record yet, use this query:

```sql
-- Insert or update membership to admin
INSERT INTO public.memberships (user_id, role)
VALUES (
  (SELECT id FROM public.profiles WHERE email = 'admin@example.com'),
  'admin'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin', 
  updated_at = NOW();
```

This query will:
- Create a membership record if one doesn't exist
- Update the existing record to admin if it does exist

---

### Method 4: Programmatic Creation (Advanced)

For automated admin creation or onboarding scripts, you can use the Supabase client with service role key:

```typescript
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use service_role key, not anon key
const supabase = createClient(
  'your-supabase-url',
  'your-service-role-key' // NOT the anon key!
);

async function promoteToAdmin(userEmail: string) {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (profileError || !profile) {
    throw new Error('User not found');
  }

  // Update membership to admin
  const { error: updateError } = await supabase
    .from('memberships')
    .upsert({
      user_id: profile.id,
      role: 'admin',
      updated_at: new Date().toISOString()
    });

  if (updateError) {
    throw new Error('Failed to promote user to admin');
  }

  console.log(`Successfully promoted ${userEmail} to admin`);
}
```

**⚠️ Security Warning**: Never expose the service role key in client-side code. Use this method only in server-side scripts or secure backend environments.

---

## Verifying Admin Access

### Via SQL Query

Check if a specific user is an admin:

```sql
-- Check a specific user's role
SELECT 
  p.email, 
  p.name, 
  m.role, 
  m.created_at,
  m.updated_at
FROM public.profiles p
LEFT JOIN public.memberships m ON p.id = m.user_id
WHERE p.email = 'admin@example.com';
```

List all admin users in the system:

```sql
-- List all admins
SELECT 
  p.email, 
  p.name, 
  p.status,
  m.role, 
  p.created_at as joined_at,
  m.updated_at as role_updated_at
FROM public.profiles p
JOIN public.memberships m ON p.id = m.user_id
WHERE m.role = 'admin'
ORDER BY p.created_at DESC;
```

Count users by role:

```sql
-- Count users by role
SELECT 
  role, 
  COUNT(*) as user_count
FROM public.memberships
GROUP BY role
ORDER BY user_count DESC;
```

---

### Testing Admin Features in the App

After promoting a user to admin, verify the following:

**Step 1**: Force App Refresh
1. Have the user completely log out of the app
2. Close and reopen the app
3. Log back in with their credentials

**Step 2**: Check Admin UI Elements

Navigate to the **Schedule** tab:
- [ ] "Add Event" button should be visible at the top
- [ ] Tap an event to see edit/delete options

Navigate to the **Community** tab:
- [ ] Open any post
- [ ] Delete button should appear on all posts and comments (not just own)
- [ ] Try deleting a test post/comment to verify permissions

Navigate to the **Profile** tab:
- [ ] User role should display as "Admin"
- [ ] No "Upgrade" prompts should appear

**Step 3**: Test Admin Actions

Create a test event:
1. Go to Schedule tab
2. Tap "Add Event" button
3. Fill in event details and save
4. Verify event appears in the list

Moderate content:
1. Go to Community tab
2. Find a test post
3. Tap the delete button
4. Confirm deletion works

---

## Admin Security Best Practices

### 1. Limit Admin Accounts

**Recommendation**: Keep admin accounts to a minimum.
- Only 2-3 trusted individuals should have admin access
- Create a regular "member" account for daily use
- Use admin account only for administrative tasks

### 2. Audit Admin Actions

Regularly review admin activity:

```sql
-- View recent admin modifications (posts/comments/events)
SELECT 
  'post' as type,
  fp.id,
  fp.title,
  fp.updated_at,
  p.email as modified_by
FROM forum_posts fp
JOIN profiles p ON fp.author_id = p.id
WHERE fp.updated_at > NOW() - INTERVAL '7 days'
ORDER BY fp.updated_at DESC;
```

### 3. Use Strong Authentication

- Enable 2FA on Supabase accounts with admin access
- Use complex, unique passwords for admin user accounts
- Never share admin credentials
- Rotate credentials if compromised

### 4. RLS Policy Enforcement

Admin privileges are enforced at the database level through RLS:
- UI checks are for UX only; real security is in RLS policies
- Admins cannot bypass RLS to access `auth.users` table directly
- All admin actions are subject to the same RLS constraints as other users, except where explicitly allowed

### 5. Document Admin Changes

Maintain a log of:
- When admin access was granted
- Who was promoted and by whom
- Reason for admin access
- Date of removal (if applicable)

### 6. Regular Access Reviews

Quarterly, review the admin user list:

```sql
-- Admin access review query
SELECT 
  p.email,
  p.name,
  m.created_at as member_since,
  m.updated_at as role_updated,
  p.onboarding_completed_at
FROM profiles p
JOIN memberships m ON p.id = m.user_id
WHERE m.role = 'admin';
```

Remove admin access for:
- Former employees or contractors
- Users who no longer need admin privileges
- Inactive accounts (no login in 90+ days)

---

## Removing Admin Access

### Demote Admin to Member

To revoke admin privileges while maintaining membership:

```sql
-- Demote admin to member
UPDATE public.memberships 
SET role = 'member', 
    updated_at = NOW()
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'former-admin@example.com'
);
```

### Demote Admin to Free User

To revoke admin and paid membership:

```sql
-- Demote admin to free user
UPDATE public.memberships 
SET role = 'free', 
    updated_at = NOW()
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'former-admin@example.com'
);
```

### Verify Demotion

```sql
-- Confirm role change
SELECT p.email, p.name, m.role, m.updated_at
FROM public.profiles p
JOIN public.memberships m ON p.id = m.user_id
WHERE p.email = 'former-admin@example.com';
```

**Important**: Have the user log out and back in for changes to take effect.

---

## Role Comparison Table

Understanding the differences between user roles:

| Feature | Guest | Free | Member | Admin |
|---------|-------|------|--------|-------|
| **Authentication** |
| Browse without account | ✓ | ✓ | ✓ | ✓ |
| Sign up with email/OTP | ✓ | ✓ | ✓ | ✓ |
| Complete onboarding | ✗ | ✓ | ✓ | ✓ |
| **Forum** |
| View posts | ✓ | ✓ | ✓ | ✓ |
| Create posts | ✗ | ✓ | ✓ | ✓ |
| Comment on posts | ✗ | ✓ | ✓ | ✓ |
| Edit own posts | ✗ | ✓ | ✓ | ✓ |
| Delete own posts | ✗ | ✓ | ✓ | ✓ |
| **Delete any post** | ✗ | ✗ | ✗ | ✓ |
| **Edit any post** | ✗ | ✗ | ✗ | ✓ |
| **Events & Classes** |
| View events | ✓ | ✓ | ✓ | ✓ |
| View event details | ✓ | ✓ | ✓ | ✓ |
| Book events | ✗ | ✓ (per-class fee) | ✓ (included) | ✓ |
| Cancel own bookings | ✗ | ✓ | ✓ | ✓ |
| **Create events** | ✗ | ✗ | ✗ | ✓ |
| **Edit any event** | ✗ | ✗ | ✗ | ✓ |
| **Delete events** | ✗ | ✗ | ✗ | ✓ |
| **View all bookings** | ✗ | ✗ | ✗ | ✓ |
| **Profile** |
| View own profile | ✗ | ✓ | ✓ | ✓ |
| Edit own profile | ✗ | ✓ | ✓ | ✓ |
| View membership status | ✗ | ✓ | ✓ | ✓ |
| Upgrade membership | ✗ | ✓ | ✗ | ✗ |
| **View all profiles** | ✗ | ✗ | ✗ | ✓ |
| **Modify user roles** | ✗ | ✗ | ✗ | ✓ |

**Legend:**
- ✓ = Feature available
- ✗ = Feature not available
- **Bold** = Admin-exclusive feature

---

## Troubleshooting

### Issue: Admin Features Not Showing Up

**Symptoms:**
- User has admin role in database but UI doesn't show admin buttons
- "Add Event" button not visible in Schedule tab
- Delete buttons missing from posts/comments

**Solutions:**

1. **Force Logout and Login**
   ```
   - Completely close the app (swipe up in app switcher)
   - Reopen and log out
   - Log back in to refresh auth state
   ```

2. **Verify Role in Database**
   ```sql
   SELECT p.email, m.role, m.updated_at
   FROM profiles p
   JOIN memberships m ON p.id = m.user_id
   WHERE p.email = 'admin@example.com';
   ```
   If role shows anything other than 'admin', re-run the promotion query.

3. **Check AuthContext Loading**
   - Look for console logs showing role loading
   - Verify `useIsAdmin()` hook returns true
   - Check network tab for successful API calls

4. **Clear App Data (Last Resort)**
   - On iOS: Delete and reinstall app
   - On Android: Settings > Apps > The Mom Club > Clear Data
   - Log back in after clearing

---

### Issue: Permission Denied Errors

**Symptoms:**
- Admin can see buttons but gets errors when clicking
- "You don't have permission" message appears
- Database operations fail with RLS policy errors

**Solutions:**

1. **Verify RLS Policies Exist**
   ```sql
   -- Check if admin policies exist
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE policyname LIKE '%admin%';
   ```

2. **Check get_my_role() Function**
   ```sql
   -- Test the role function
   SELECT public.get_my_role();
   ```
   Should return 'admin' when run by an admin user.

3. **Review RLS Policy Logic**
   - Ensure policies check for `get_my_role() = 'admin'` or `get_my_role() IN ('admin', 'member')`
   - Verify policies use `USING` for SELECT and `WITH CHECK` for INSERT/UPDATE/DELETE

4. **Migration Issues**
   - Ensure all migrations have run successfully
   - Check Supabase Dashboard > Database > Migrations
   - Re-run failed migrations if necessary

---

### Issue: Role Not Updating in App

**Symptoms:**
- Database shows admin role but app shows "Free" or "Member"
- Role changes don't take effect immediately
- AuthContext not reflecting current role

**Solutions:**

1. **Session Refresh**
   - Log out completely
   - Wait 30 seconds
   - Log back in
   - This forces a new session token with updated claims

2. **Check Session Token**
   - Session tokens are cached for performance
   - Old tokens may still have old role claims
   - Logging out clears the cached token

3. **Verify Profile vs Membership**
   ```sql
   -- Ensure profile and membership are in sync
   SELECT 
     p.id, 
     p.email, 
     m.role, 
     m.user_id
   FROM profiles p
   LEFT JOIN memberships m ON p.id = m.user_id
   WHERE p.email = 'admin@example.com';
   ```
   If `user_id` is NULL, the membership record doesn't exist or is mislinked.

4. **Create Missing Membership**
   ```sql
   -- If membership record is missing
   INSERT INTO memberships (user_id, role)
   SELECT id, 'admin'
   FROM profiles
   WHERE email = 'admin@example.com'
   ON CONFLICT (user_id) DO NOTHING;
   ```

---

### Issue: Admin Can't Delete Specific Content

**Symptoms:**
- Can delete some posts/comments but not others
- Delete button appears but action fails
- Specific events can't be deleted

**Solutions:**

1. **Check Foreign Key Constraints**
   - Events with bookings may be protected by cascade rules
   - Delete bookings first, then event

2. **Verify Specific RLS Policy**
   ```sql
   -- Check delete policy for forum_posts
   SELECT * FROM pg_policies 
   WHERE tablename = 'forum_posts' 
   AND cmd = 'DELETE';
   ```

3. **Check for Trigger Conflicts**
   - Some content may have triggers preventing deletion
   - Review trigger logic in migrations

---

## Related Documentation

### Internal Documentation
- **[Assignment Deliverable (architecture & schema)](ASSIGNMENT_PART2_PART3_Deliverable.md)** - System diagram, database ERD, RLS
- **[Database Schema](../supabase/migrations/001_initial.sql)** - Complete database structure
- **[RLS Policies](../supabase/migrations/003_admin_policies.sql)** - Security policy definitions
- **[Edge Functions](../supabase/functions/)** - Serverless function implementations
- **[Project Timeline](../PROJECT_TIMELINE.md)** - Development timeline and milestones

### Supabase Resources
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security) - Row Level Security guide
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth) - Authentication setup
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html) - Policy syntax reference

### App-Specific
- **[Main App README](../the-mom-club/README.md)** - App setup and usage guide
- **[AuthContext](../the-mom-club/contexts/AuthContext.tsx)** - Role-based hooks implementation

---

## Quick Reference

### Common SQL Commands

```sql
-- Promote user to admin
UPDATE memberships SET role = 'admin', updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com');

-- List all admins
SELECT p.email, p.name FROM profiles p
JOIN memberships m ON p.id = m.user_id
WHERE m.role = 'admin';

-- Demote admin to free
UPDATE memberships SET role = 'free', updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@example.com');

-- Count users by role
SELECT role, COUNT(*) FROM memberships GROUP BY role;
```

### Security Checklist

- [ ] Admin count is minimal (2-3 users)
- [ ] All admins use strong authentication
- [ ] Admin actions are audited quarterly
- [ ] Inactive admin accounts are removed
- [ ] Service role key is never exposed client-side
- [ ] RLS policies are tested and verified
- [ ] Admin changes are documented

---

**Last Updated**: February 2026  
**Maintainer**: Technical Team  
**Questions?** Refer to the [main app README](../the-mom-club/README.md) or open an issue.
