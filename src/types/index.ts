export interface TopicWithArticles {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  status: string;
  createdAt: Date;
  articles: ArticleWithPerspective[];
}

export interface ArticleWithPerspective {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Date;
  perspective: {
    id: string;
    name: string;
    slug: string;
    category: string;
    color: string | null;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
  };
  _count?: {
    likes: number;
    saves: number;
    comments: number;
  };
}

export interface FeedArticle {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  perspective: {
    id: string;
    name: string;
    slug: string;
    category: string;
    color: string | null;
  };
  topic: {
    id: string;
    title: string;
    slug: string;
    _count: { articles: number };
  };
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  createdAt: Date;
  _count: {
    following: number;
    followers: number;
    likes: number;
    saves: number;
  };
  isFollowing?: boolean;
}
