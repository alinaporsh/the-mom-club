-- Admin Role Implementation
-- This migration adds admin-specific RLS policies for full platform management

-- ============================================
-- PROFILES: Admins can view and manage all profiles
-- ============================================

-- Admins can read all profiles (not just their own)
CREATE POLICY "profiles_select_admin" ON public.profiles 
  FOR SELECT 
  USING (public.get_my_role() = 'admin');

-- Admins can update any profile (for moderation/support)
CREATE POLICY "profiles_update_admin" ON public.profiles 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- ============================================
-- MEMBERSHIPS: Admins can view and modify all memberships
-- ============================================

-- Admins can read all memberships
CREATE POLICY "memberships_select_admin" ON public.memberships 
  FOR SELECT 
  USING (public.get_my_role() = 'admin');

-- Admins can update any membership (to change roles, manage access)
CREATE POLICY "memberships_update_admin" ON public.memberships 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- Admins can insert memberships for any user
CREATE POLICY "memberships_insert_admin" ON public.memberships 
  FOR INSERT 
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================
-- FORUM POSTS: Admins can moderate (delete any post)
-- ============================================

-- Admins can delete any post (moderation)
CREATE POLICY "forum_posts_delete_admin" ON public.forum_posts 
  FOR DELETE 
  USING (public.get_my_role() = 'admin');

-- Admins can update any post (edit for moderation)
CREATE POLICY "forum_posts_update_admin" ON public.forum_posts 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- ============================================
-- FORUM COMMENTS: Admins can moderate (delete any comment)
-- ============================================

-- Admins can delete any comment (moderation)
CREATE POLICY "forum_comments_delete_admin" ON public.forum_comments 
  FOR DELETE 
  USING (public.get_my_role() = 'admin');

-- Admins can update any comment (edit for moderation)
CREATE POLICY "forum_comments_update_admin" ON public.forum_comments 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- ============================================
-- EVENTS: Admins can create, update, and delete events
-- ============================================

-- Admins can insert events
CREATE POLICY "events_insert_admin" ON public.events 
  FOR INSERT 
  WITH CHECK (public.get_my_role() = 'admin');

-- Admins can update events
CREATE POLICY "events_update_admin" ON public.events 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- Admins can delete events
CREATE POLICY "events_delete_admin" ON public.events 
  FOR DELETE 
  USING (public.get_my_role() = 'admin');

-- ============================================
-- BOOKINGS: Admins can view and manage all bookings
-- ============================================

-- Admins can read all bookings
CREATE POLICY "bookings_select_admin" ON public.bookings 
  FOR SELECT 
  USING (public.get_my_role() = 'admin');

-- Admins can update any booking (manage attendance, status)
CREATE POLICY "bookings_update_admin" ON public.bookings 
  FOR UPDATE 
  USING (public.get_my_role() = 'admin');

-- Admins can delete any booking (cancel on behalf of users)
CREATE POLICY "bookings_delete_admin" ON public.bookings 
  FOR DELETE 
  USING (public.get_my_role() = 'admin');

-- Admins can insert bookings for any user (manual registration)
CREATE POLICY "bookings_insert_admin" ON public.bookings 
  FOR INSERT 
  WITH CHECK (public.get_my_role() = 'admin');
