-- The Mom Club MVP: profiles, memberships, forum, events, bookings
-- Run in Supabase SQL Editor or via supabase db push

-- Custom types for role and status
CREATE TYPE app_role AS ENUM ('guest', 'free', 'member', 'admin');
CREATE TYPE user_status AS ENUM ('pregnant', 'new_mom');

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  status user_status,
  due_date DATE,
  baby_age TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships (one per user)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  role app_role NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forum
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events / classes
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  instructor TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: get current user's role (returns 'guest' if not in memberships)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.memberships WHERE user_id = auth.uid()),
    'guest'::app_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS: enable on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Memberships: users can read own; insert/update via service/edge only or allow own for onboarding
CREATE POLICY "memberships_select_own" ON public.memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "memberships_insert_own" ON public.memberships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "memberships_update_own" ON public.memberships FOR UPDATE USING (user_id = auth.uid());

-- Events: everyone can read (public)
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (true);

-- Forum posts: everyone can read; only member/admin can insert; author can update/delete own
CREATE POLICY "forum_posts_select_all" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert_member" ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.get_my_role() IN ('member', 'admin'));
CREATE POLICY "forum_posts_update_own" ON public.forum_posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "forum_posts_delete_own" ON public.forum_posts FOR DELETE USING (author_id = auth.uid());

-- Forum comments: everyone can read; member/admin can insert; author can delete own
CREATE POLICY "forum_comments_select_all" ON public.forum_comments FOR SELECT USING (true);
CREATE POLICY "forum_comments_insert_member" ON public.forum_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.get_my_role() IN ('member', 'admin'));
CREATE POLICY "forum_comments_delete_own" ON public.forum_comments FOR DELETE USING (author_id = auth.uid());

-- Bookings: users can read own; member/admin can insert (own); user can update/delete own
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookings_insert_member" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.get_my_role() IN ('member', 'admin'));
CREATE POLICY "bookings_delete_own" ON public.bookings FOR DELETE USING (user_id = auth.uid());

-- Seed one event for testing (optional)
-- Use logical class time: 10:00 AM
INSERT INTO public.events (title, description, starts_at, instructor, location)
VALUES (
  'Prenatal Yoga',
  'Gentle yoga for expecting moms.',
  DATE_TRUNC('day', NOW() + INTERVAL '7 days') + INTERVAL '10 hours',
  'Jane Doe',
  'Online'
);
