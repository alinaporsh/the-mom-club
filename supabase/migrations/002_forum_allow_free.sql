-- Allow free, member, and admin to insert forum_posts and forum_comments (free can post/comment).
DROP POLICY IF EXISTS "forum_posts_insert_member" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_free_or_member" ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.get_my_role() IN ('free', 'member', 'admin'));

DROP POLICY IF EXISTS "forum_comments_insert_member" ON public.forum_comments;
CREATE POLICY "forum_comments_insert_free_or_member" ON public.forum_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.get_my_role() IN ('free', 'member', 'admin'));
