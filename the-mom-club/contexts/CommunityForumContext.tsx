import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ForumComment = {
  id: string;
  parentId: string | null;
  authorName: string;
  text: string;
  createdAt: string;
  voteCount: number;
  userVote?: "up" | "down" | null;
  mediaUri?: string;
};

export type ForumPost = {
  id: string;
  communityId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  voteCount: number;
  commentCount: number;
  mediaUri?: string;
  userVote?: "up" | "down" | null;
  comments: ForumComment[];
};

export type Community = {
  id: string;
  name: string;
  description: string;
  rules: string[];
  memberCount: number;
  isJoined?: boolean;
};

type ForumContextValue = {
  communities: Community[];
  posts: ForumPost[];
  getCommunityById: (id: string) => Community | undefined;
  getPostsForCommunity: (communityId: string) => ForumPost[];
  getPostById: (id: string) => ForumPost | undefined;
  toggleJoinCommunity: (communityId: string) => void;
  togglePostVote: (postId: string, direction: "up" | "down") => void;
  addPost: (
    communityId: string,
    title: string,
    body: string,
    authorName: string,
    mediaUri?: string
  ) => string;
  addReply: (
    postId: string,
    parentId: string | null,
    text: string,
    authorName?: string,
    mediaUri?: string
  ) => void;
  toggleCommentVote: (postId: string, commentId: string, direction: "up" | "down") => void;
};

const CommunityForumContext = createContext<ForumContextValue | undefined>(undefined);

const initialCommunities: Community[] = [
  {
    id: "pregnancy",
    name: "Pregnancy & Bump Chat",
    description: "Share how you're feeling during pregnancy, ask questions, and get support from moms in the same phase.",
    rules: [
      "Be kind and respectful in all conversations.",
      "No medical advice in place of a professional consultation.",
      "Keep personal details private and avoid sharing sensitive data.",
    ],
    memberCount: 1284,
    isJoined: true,
  },
  {
    id: "newborn",
    name: "Newborn & Sleep Support",
    description: "Night feeds, naps, and everything in between for the first 12 months.",
    rules: [
      "No shaming around sleep choices or feeding methods.",
      "Mark sensitive topics with a quick content warning.",
      "Remember every baby is different—share what worked for you.",
    ],
    memberCount: 932,
    isJoined: false,
  },
  {
    id: "nutrition",
    name: "Feeding & First Foods",
    description: "Talk about breastfeeding, formula, pumping, and starting solids in a judgment-free zone.",
    rules: [
      "Fed is best—no guilt, no pressure.",
      "Avoid promoting restrictive or unsafe diets.",
      "Always defer to your pediatrician for medical concerns.",
    ],
    memberCount: 756,
    isJoined: false,
  },
];

const initialPosts: ForumPost[] = [
  {
    id: "p1",
    communityId: "pregnancy",
    title: "32 weeks and so tired — any gentle energy boosters?",
    body: "I’m 32 weeks and feeling completely wiped out by lunchtime. What helped you get through the last trimester without overdoing it?",
    authorName: "Amelia",
    createdAt: "2026-02-10T09:00:00Z",
    voteCount: 24,
    commentCount: 3,
    mediaUri:
      "https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=800&auto=format&fit=crop",
    userVote: null,
    comments: [
      {
        id: "c1",
        parentId: null,
        authorName: "Lena",
        text: "Short walks and a big water bottle helped me a ton. Also lowered my expectations for how much I could get done in a day.",
        createdAt: "2026-02-10T10:00:00Z",
        voteCount: 6,
      },
      {
        id: "c2",
        parentId: "c1",
        authorName: "Amelia",
        text: "Love this reminder. I keep trying to power through like I used to.",
        createdAt: "2026-02-10T10:20:00Z",
        voteCount: 2,
      },
      {
        id: "c3",
        parentId: null,
        authorName: "Maya",
        text: "Snacks with protein every couple of hours helped balance my energy. Greek yogurt, nuts, and cheese sticks were my go-to.",
        createdAt: "2026-02-10T11:00:00Z",
        voteCount: 4,
      },
    ],
  },
  {
    id: "p2",
    communityId: "newborn",
    title: "Baby only contact naps — is this a phase?",
    body: "My 3-week-old will only sleep on me during the day. As soon as I put her down, she wakes up. Is this normal and does it get better?",
    authorName: "Sara",
    createdAt: "2026-02-09T14:30:00Z",
    voteCount: 31,
    commentCount: 4,
    mediaUri:
      "https://images.unsplash.com/photo-1529688530646-6dc7840c0542?q=80&w=800&auto=format&fit=crop",
    userVote: null,
    comments: [
      {
        id: "c4",
        parentId: null,
        authorName: "Jo",
        text: "Totally normal. Their nervous systems are still figuring things out. I used a wrap during the day and it saved me.",
        createdAt: "2026-02-09T15:00:00Z",
        voteCount: 10,
      },
      {
        id: "c5",
        parentId: "c4",
        authorName: "Sara",
        text: "Thank you, this makes me feel so much better.",
        createdAt: "2026-02-09T15:20:00Z",
        voteCount: 3,
      },
      {
        id: "c6",
        parentId: null,
        authorName: "Elena",
        text: "It was a phase for us around 8–10 weeks. We practiced one crib nap a day with lots of cuddles before and after.",
        createdAt: "2026-02-09T16:10:00Z",
        voteCount: 5,
      },
      {
        id: "c7",
        parentId: "c6",
        authorName: "Maya",
        text: "Same here. One practice nap a day felt manageable.",
        createdAt: "2026-02-09T16:40:00Z",
        voteCount: 1,
      },
    ],
  },
  {
    id: "p3",
    communityId: "nutrition",
    title: "Best first finger foods for baby-led weaning?",
    body: "We’re starting solids next week and planning to try baby-led weaning. What were your baby’s favorite first finger foods?",
    authorName: "Chloe",
    createdAt: "2026-02-09T09:15:00Z",
    voteCount: 18,
    commentCount: 2,
    mediaUri:
      "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?q=80&w=800&auto=format&fit=crop",
    userVote: null,
    comments: [
      {
        id: "c8",
        parentId: null,
        authorName: "Rina",
        text: "Steamed sweet potato wedges and avocado slices were a hit here. Super soft and easy to grip.",
        createdAt: "2026-02-09T10:00:00Z",
        voteCount: 7,
      },
      {
        id: "c9",
        parentId: null,
        authorName: "Nora",
        text: "Banana spears and soft scrambled eggs (cut into strips) worked really well for us.",
        createdAt: "2026-02-09T10:30:00Z",
        voteCount: 3,
      },
    ],
  },
];

type Props = {
  children: React.ReactNode;
};

const POSTS_STORAGE_KEY = "community_forum_posts_v2";

export function CommunityForumProvider({ children }: Props) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [hasHydratedPosts, setHasHydratedPosts] = useState(false);

  useEffect(() => {
    const loadPersistedPosts = async () => {
      try {
        const stored = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setPosts(parsed);
          }
        }
      } catch (error) {
        console.warn("Failed to load community forum posts from storage", error);
      } finally {
        setHasHydratedPosts(true);
      }
    };

    loadPersistedPosts();
  }, []);

  useEffect(() => {
    if (!hasHydratedPosts) return;

    const persistPosts = async () => {
      try {
        await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
      } catch (error) {
        console.warn("Failed to save community forum posts to storage", error);
      }
    };

    void persistPosts();
  }, [posts, hasHydratedPosts]);

  const toggleJoinCommunity = (communityId: string) => {
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId ? { ...c, isJoined: !c.isJoined } : c
      )
    );
  };

  const togglePostVote = (postId: string, direction: "up" | "down") => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        let voteCount = post.voteCount;
        let userVote = post.userVote ?? null;

        if (userVote === direction) {
          // Undo existing vote
          voteCount += direction === "up" ? -1 : 1;
          userVote = null;
        } else {
          // Remove previous vote, if any
          if (userVote === "up") voteCount -= 1;
          if (userVote === "down") voteCount += 1;
          // Apply new vote
          voteCount += direction === "up" ? 1 : -1;
          userVote = direction;
        }

        return { ...post, voteCount, userVote };
      })
    );
  };

  const addPost = (
    communityId: string,
    title: string,
    body: string,
    authorName: string,
    mediaUri?: string
  ) => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return "";

    const id = `local-post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();

    const newPost: ForumPost = {
      id,
      communityId,
      title: trimmedTitle,
      body: trimmedBody,
      authorName,
      createdAt,
      voteCount: 0,
      commentCount: 0,
      mediaUri,
      userVote: null,
      comments: [],
    };

    setPosts((prev) => [newPost, ...prev]);

    return id;
  };

  const addReply = (
    postId: string,
    parentId: string | null,
    text: string,
    authorName: string = "You",
    mediaUri?: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const newComment: ForumComment = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          parentId,
          authorName,
          text: trimmed,
          createdAt: new Date().toISOString(),
          voteCount: 0,
          userVote: null,
          mediaUri,
        };

        return {
          ...post,
          commentCount: post.commentCount + 1,
          comments: [...post.comments, newComment],
        };
      })
    );
  };

  const toggleCommentVote = (
    postId: string,
    commentId: string,
    direction: "up" | "down"
  ) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const updatedComments = post.comments.map((comment) => {
          if (comment.id !== commentId) return comment;

          let voteCount = comment.voteCount;
          let userVote = comment.userVote ?? null;

          if (userVote === direction) {
            // Undo existing vote
            voteCount += direction === "up" ? -1 : 1;
            userVote = null;
          } else {
            // Remove previous vote, if any
            if (userVote === "up") voteCount -= 1;
            if (userVote === "down") voteCount += 1;
            // Apply new vote
            voteCount += direction === "up" ? 1 : -1;
            userVote = direction;
          }

          return { ...comment, voteCount, userVote };
        });

        return { ...post, comments: updatedComments };
      })
    );
  };

  const helpers = useMemo(
    () => ({
      getCommunityById: (id: string) => communities.find((c) => c.id === id),
      getPostsForCommunity: (communityId: string) =>
        posts.filter((p) => p.communityId === communityId),
      getPostById: (id: string) => posts.find((p) => p.id === id),
    }),
    [communities, posts]
  );

  const value: ForumContextValue = {
    communities,
    posts,
    ...helpers,
    toggleJoinCommunity,
    togglePostVote,
    addPost,
    addReply,
    toggleCommentVote,
  };

  return (
    <CommunityForumContext.Provider value={value}>
      {children}
    </CommunityForumContext.Provider>
  );
}

export function useCommunityForum() {
  const ctx = useContext(CommunityForumContext);
  if (!ctx) {
    throw new Error("useCommunityForum must be used within a CommunityForumProvider");
  }
  return ctx;
}

