-- Add image_url to forum_posts for optional image attachments
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Allow reading profile names of users who have posted or commented (for "Posted by X" display)
-- Without this, RLS would block joins to profiles when viewing others' posts
CREATE POLICY "profiles_select_author_of_forum_content" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR id IN (SELECT author_id FROM public.forum_posts)
  OR id IN (SELECT author_id FROM public.forum_comments)
);
