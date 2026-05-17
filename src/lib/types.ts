export type PostStatus = "draft" | "review" | "analysis" | "approved" | "rejected" | "published" | "queued" | "generating";

export type PortalPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  imagePrompt?: string | null;
  category: string;
  tags: string[];
  status: PostStatus;
  priority: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  reviewerNotes: string | null;
  sourceTopic?: string | null;
  editorialAngle?: string | null;
  visualFingerprint?: string | null;
  contentFingerprint?: string | null;
  sourceUrls?: string[] | null;
  sourceTitles?: string[] | null;
  factualNotes?: string | null;
  generationProvider?: string | null;
  generationModel?: string | null;
  editorialScore?: number | null;
  editorialAudit?: {
    score: number;
    passed: boolean;
    checks: Array<{ key: string; label: string; passed: boolean; points: number; detail: string }>;
    blockers: string[];
    auditedAt: string;
  } | null;
  editorialRevisionCount?: number | null;
  reviewedAt?: string | null;
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
