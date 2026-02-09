import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  forumPosts: ["forum", "posts"] as const,
  forumPost: (id: string) => ["forum", "post", id] as const,
  forumComments: (postId: string) => ["forum", "post", postId, "comments"] as const,
  events: ["events"] as const,
  event: (id: string) => ["events", id] as const,
};
