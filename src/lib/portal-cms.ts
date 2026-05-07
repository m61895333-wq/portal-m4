import { unstable_noStore as noStore } from "next/cache";
import { categories } from "./categories";
import { generateEditorialDraft } from "./article-generator";
import { getSupabaseAdmin, hasSupabaseConfig } from "./supabase";
import type { PerformanceSummary, PortalPost, PostStatus } from "./types";

type DbPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  tags: string[];
  status: PostStatus;
  priority: number;
  scheduled_at: string | null;
  published_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

function fromDb(row: DbPost): PortalPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    imageUrl: row.image_url,
    category: row.category,
    tags: row.tags ?? [],
    status: row.status,
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active
  };
}

function toDb(post: Partial<PortalPost>) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    image_url: post.imageUrl,
    category: post.category,
    tags: post.tags,
    status: post.status,
    priority: post.priority,
    scheduled_at: post.scheduledAt,
    published_at: post.publishedAt,
    reviewer_notes: post.reviewerNotes,
    is_active: post.isActive
  };
}

export const fallbackPost: PortalPost = {
  id: "fallback-portal-m4",
  slug: "portal-m4-inteligencia-financeira-e-tecnologia",
  title: "Portal M4: inteligencia financeira, tecnologia e IA para decidir melhor",
  excerpt:
    "Uma visao editorial sobre como tecnologia, investimentos e inteligencia artificial se conectam na nova economia.",
  content:
    "O Portal M4 nasce para entregar analises profissionais sobre mercado financeiro, investimentos, tecnologia, inteligencia artificial e carreira. A proposta e transformar informacao dispersa em leitura organizada, util e confiavel.\n\nNosso padrao editorial prioriza profundidade, imagens realistas, clareza e revisao humana antes da publicacao. O objetivo nao e produzir volume sem criterio, mas criar um canal premium com consistencia e autoridade.",
  imageUrl: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=85",
  category: "inteligencia-artificial",
  tags: ["portal-m4", "inteligencia-artificial", "investimentos"],
  status: "published",
  priority: 1,
  scheduledAt: null,
  publishedAt: new Date().toISOString(),
  reviewerNotes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
};

export async function listPosts(status?: PostStatus | "all") {
  noStore();
  if (!hasSupabaseConfig()) return [fallbackPost];

  let query = getSupabaseAdmin()
    .from("portal_posts")
    .select("*")
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao listar posts:", error.message);
    return [fallbackPost];
  }

  return (data as DbPost[]).map(fromDb);
}

export async function listPublicPosts() {
  noStore();
  if (!hasSupabaseConfig()) return [fallbackPost];

  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .select("*")
    .in("status", ["approved", "published"])
    .eq("is_active", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) return [fallbackPost];
  return (data as DbPost[]).map(fromDb);
}

export async function getPostBySlug(slug: string) {
  noStore();
  if (!hasSupabaseConfig()) return slug === fallbackPost.slug ? fallbackPost : null;

  const { data, error } = await getSupabaseAdmin().from("portal_posts").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return fromDb(data as DbPost);
}

export async function listCategoryPosts(category: string) {
  const posts = await listPublicPosts();
  return posts.filter((post) => post.category === category);
}

export async function createDraft(input: { topic?: string; sourceUrl?: string; approach?: string; scheduledAt?: string }) {
  const draft = generateEditorialDraft(input);
  if (!hasSupabaseConfig()) return { ...fallbackPost, ...draft, id: "local-draft" };

  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .insert(toDb(draft) as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbPost);
}

export async function updatePost(id: string, updates: Partial<PortalPost>) {
  if (!hasSupabaseConfig()) throw new Error("Supabase nao configurado.");
  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .update({ ...toDb(updates), updated_at: new Date().toISOString() } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbPost);
}

export async function deletePost(id: string) {
  if (!hasSupabaseConfig()) return;
  const { error } = await getSupabaseAdmin().from("portal_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function recordPostView(postId: string) {
  if (!hasSupabaseConfig() || postId.startsWith("fallback")) return;
  await getSupabaseAdmin().from("portal_post_views").insert({ post_id: postId } as never);
}

export async function listTopicTags() {
  noStore();
  if (!hasSupabaseConfig()) return [];
  const { data, error } = await getSupabaseAdmin().from("portal_topic_tags").select("tag").order("created_at");
  if (error) return [];
  return ((data ?? []) as Array<{ tag: string }>).map((row) => row.tag);
}

export async function addTopicTag(tag: string) {
  if (!hasSupabaseConfig()) return;
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return;
  await getSupabaseAdmin().from("portal_topic_tags").upsert({ tag: normalized } as never);
}

export async function removeTopicTag(tag: string) {
  if (!hasSupabaseConfig()) return;
  await getSupabaseAdmin().from("portal_topic_tags").delete().eq("tag", tag);
}

export async function getPerformance(period: "week" | "month" = "week"): Promise<PerformanceSummary> {
  noStore();
  const since = new Date();
  since.setDate(since.getDate() - (period === "week" ? 7 : 30));

  const posts = await listPosts("all");
  if (!hasSupabaseConfig()) {
    return {
      totalViews: 0,
      mostReadPosts: [],
      mostReadTopics: categories.slice(0, 3).map((category) => ({ topic: category.slug, views: 0 })),
      leastReadTopics: categories.slice(0, 3).map((category) => ({ topic: category.slug, views: 0 }))
    };
  }

  const { data } = await getSupabaseAdmin()
    .from("portal_post_views")
    .select("post_id")
    .gte("viewed_at", since.toISOString());

  const counts = new Map<string, number>();
  for (const view of (data ?? []) as Array<{ post_id: string }>) {
    counts.set(view.post_id, (counts.get(view.post_id) ?? 0) + 1);
  }

  const withViews = posts.map((post) => ({ post, views: counts.get(post.id) ?? 0 }));
  const mostReadPosts = withViews
    .filter((item) => item.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((item) => ({ title: item.post.title, slug: item.post.slug, views: item.views }));

  const topicMap = new Map<string, number>();
  for (const item of withViews) {
    for (const tag of [item.post.category, ...item.post.tags]) {
      topicMap.set(tag, (topicMap.get(tag) ?? 0) + item.views);
    }
  }

  const topics = [...topicMap.entries()].map(([topic, views]) => ({ topic, views }));
  return {
    totalViews: [...counts.values()].reduce((sum, value) => sum + value, 0),
    mostReadPosts,
    mostReadTopics: topics.filter((topic) => topic.views > 0).sort((a, b) => b.views - a.views).slice(0, 5),
    leastReadTopics: topics.sort((a, b) => a.views - b.views).slice(0, 5)
  };
}
