-- Forum Post Voting System (Posts only, no comment votes)
-- One vote per user per post; vote is 1 (upvote) or -1 (downvote)

CREATE TABLE IF NOT EXISTS public.forum_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes (needed for aggregated counts)
CREATE POLICY "forum_post_votes_select_all" ON public.forum_post_votes
  FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "forum_post_votes_insert_own" ON public.forum_post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "forum_post_votes_update_own" ON public.forum_post_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "forum_post_votes_delete_own" ON public.forum_post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_post_id ON public.forum_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_user_id ON public.forum_post_votes(user_id);
