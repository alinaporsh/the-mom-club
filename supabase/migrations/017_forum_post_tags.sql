-- Add explicit tag column to forum_posts
ALTER TABLE public.forum_posts 
  ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'General';
