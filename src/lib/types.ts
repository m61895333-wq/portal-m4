export type PostStatus = "draft" | "review" | "approved" | "rejected" | "published" | "queued" | "generating";

export type PortalPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  tags: string[];
  status: PostStatus;
  priority: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type TopicMetric = {
  topic: string;
  views: number;
};

export type PerformanceSummary = {
  totalViews: number;
  absoluteTotal: number;
  previousViews: number;
  trendPercentage: number;
  dailyData: number[];
  mostReadPosts: Array<{ title: string; slug: string; views: number }>;
  recentPosts: Array<{ title: string; slug: string }>;
  mostReadTopics: TopicMetric[];
  leastReadTopics: TopicMetric[];
};
