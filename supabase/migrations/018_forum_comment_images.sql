-- Add image_url to forum_comments for optional image attachments (mock/local URI)
ALTER TABLE public.forum_comments 
  ADD COLUMN IF NOT EXISTS image_url TEXT;
