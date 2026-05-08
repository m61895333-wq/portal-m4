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

/**
 * fromDb
 * Sanitiza e formata os dados vindos do banco de dados (Supabase).
 * REGRA: Remove todos os asteriscos (**) de título, resumo e conteúdo.
 */
function fromDb(row: DbPost): PortalPost {
  const imageUrl = row.image_url || "https://images.unsplash.com/photo-1611974714658-058f40da23fb?q=80&w=2070&auto=format&fit=crop";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title.replace(/\*/g, '').trim(),
    excerpt: row.excerpt.replace(/\*/g, '').trim(),
    content: row.content.replace(/\*/g, '').trim(),
    imageUrl: imageUrl,
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
  id: "fallback-1",
  slug: "portal-m4-inteligencia-financeira-tecnologia-e-ia-para-decidir-melhor-1778102813-3",
  title: "Portal M4: inteligencia financeira, tecnologia e IA para decidir melhor",
  excerpt: "Uma visao editorial sobre como tecnologia, investimentos e inteligencia artificial se conectam na nova economia.",
  content: "Conteudo editorial de alta qualidade...",
  imageUrl: "https://images.unsplash.com/photo-1611974714658-058f40da23fb?q=80&w=2070&auto=format&fit=crop",
  category: "INTELIGENCIA ARTIFICIAL",
  tags: ["tecnologia", "investimentos", "IA"],
  status: "published",
  priority: 1,
  scheduledAt: null,
  publishedAt: new Date().toISOString(),
  reviewerNotes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
};

const mockPosts: PortalPost[] = [
  {
    ...fallbackPost,
    id: "mock-1",
    slug: "analise-especialista-automacao-com-ia-em-foco-1778102813-3",
    title: "Analise Especialista: automacao com ia em foco",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop",
    category: "INTELIGENCIA ARTIFICIAL"
  },
  {
    ...fallbackPost,
    id: "mock-2",
    slug: "analise-especialista-planejamento-patrimonial-em-foco",
    title: "Analise Especialista: planejamento patrimonial em foco",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop",
    category: "INVESTIMENTOS"
  },
  {
    ...fallbackPost,
    id: "mock-3",
    slug: "analise-especialista-juros-e-inflacao-em-foco",
    title: "Analise Especialista: juros e inflacao em foco",
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2000&auto=format&fit=crop",
    category: "MERCADO FINANCEIRO"
  }
];

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

/**
 * [LEGADO] createDraft
 * Gera um artigo sincronicamente (via API Vercel).
 * Substituído pelo Modo Artesão (createQueuedPost) devido a limites de timeout da Vercel.
 */
export async function createDraft(input: { topic?: string; sourceUrl?: string; approach?: string; scheduledAt?: string }) {
  const draft = await generateEditorialDraft(input);
  if (!hasSupabaseConfig()) return { ...fallbackPost, ...draft, id: "local-draft" };

  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .insert(toDb(draft) as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbPost);
}

/**
 * createQueuedPost (Modo Artesão)
 * Adiciona um novo tópico à fila. O Agente (VPS 8GB) processará este item
 * de forma autônoma e gerará um conteúdo profundo de 16k tokens.
 * 
 * REGRA ANTI-DUPLICAÇÃO: Verifica se já existe artigo com título similar
 * antes de enfileirar. Lança erro se detectar duplicata.
 */
export async function createQueuedPost(input: { topic: string; scheduledAt?: string }) {
  if (!hasSupabaseConfig()) throw new Error("Supabase não configurado.");

  // CURADORIA: Normaliza o tópico para comparação (remove acentos e lowercase)
  const normalizedTopic = input.topic
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  
  // Pega as primeiras 40 letras significativas para comparação fuzzy
  const searchKey = normalizedTopic.replace(/[^a-z0-9 ]/g, "").slice(0, 40).trim();

  // VERIFICAÇÃO DE DUPLICATA: busca posts com título parecido nos últimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existingPosts } = await getSupabaseAdmin()
    .from("portal_posts")
    .select("id, title, status")
    .ilike("title", `%${searchKey.slice(0, 25)}%`)
    .gte("created_at", thirtyDaysAgo)
    .limit(3);

  if (existingPosts && existingPosts.length > 0) {
    const dupe = existingPosts[0];
    throw new Error(
      `CURADORIA M4: Artigo similar já existe na base (${dupe.status.toUpperCase()}): "${dupe.title}". Tente um ângulo diferente ou tema mais específico.`
    );
  }

  // Criamos um esqueleto do post. O Agente na VPS preencherá o conteúdo e o excerpt.
  const slug = `pauta-${Date.now()}-${input.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;

  const postData = {
    title: input.topic,
    slug: slug,
    content: "Gerando conteúdo na VPS...",
    excerpt: "Aguardando processamento da IA na VPS...",
    category: "GERAL",
    status: "queued" as PostStatus,
    priority: 1,
    imageUrl: null,
    scheduledAt: input.scheduledAt,
    isActive: true
  };

  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .insert(toDb(postData as any) as never)
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

export async function recordPageView(path: string) {
  if (!hasSupabaseConfig()) return;
  await getSupabaseAdmin().from("portal_page_views").insert({ path: path } as never);
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
  const { error } = await getSupabaseAdmin().from("portal_topic_tags").delete().eq("tag", tag);
  if (error) console.error("Erro ao remover tag:", error);
}

export async function getAutonomyStatus() {
  noStore();
  if (!hasSupabaseConfig()) return { 
    active: false, 
    dailyCount: 5, 
    startTime: "08:00", 
    activeDays: ["seg", "ter", "qua", "qui", "sex"] 
  };
  
  try {
    const { data } = await getSupabaseAdmin()
      .from("portal_settings")
      .select("value")
      .eq("key", "autonomy")
      .single();
      
    if (data && (data as any).value) {
      return (data as any).value as { 
        active: boolean, 
        dailyCount: number,
        startTime: string,
        activeDays: string[]
      };
    }
  } catch(e) {
    console.error("Erro lendo autonomy:", e);
  }
  
  return { 
    active: false, 
    dailyCount: 5, 
    startTime: "08:00", 
    activeDays: ["seg", "ter", "qua", "qui", "sex"] 
  };
}

export async function setAutonomyStatus(active: boolean, dailyCount: number, startTime: string, activeDays: string[]) {
  if (!hasSupabaseConfig()) return;
  console.log(`[CMS] Atualizando Agente: ${active ? 'LIGADO' : 'DESLIGADO'}, Meta: ${dailyCount}, Início: ${startTime}`);
  await getSupabaseAdmin()
    .from("portal_settings")
    .upsert({ key: "autonomy", value: { active, dailyCount, startTime, activeDays } } as never);
}

export async function getPerformance(period: "week" | "month" = "week"): Promise<PerformanceSummary> {
  noStore();
  const days = period === "week" ? 7 : 30;
  const now = new Date();
  const currentStart = new Date();
  currentStart.setDate(now.getDate() - days);
  const previousStart = new Date();
  previousStart.setDate(currentStart.getDate() - days);

  const posts = await listPosts("all");
  if (!hasSupabaseConfig()) {
    return {
      totalViews: 0,
      absoluteTotal: 0,
      previousViews: 0,
      trendPercentage: 0,
      dailyData: Array(days).fill(0),
      mostReadPosts: [],
      recentPosts: [],
      mostReadTopics: categories.slice(0, 3).map((category) => ({ topic: category.slug, views: 0 })),
      leastReadTopics: categories.slice(0, 3).map((category) => ({ topic: category.slug, views: 0 }))
    };
  }

  const { data } = await getSupabaseAdmin()
    .from("portal_post_views")
    .select("post_id, viewed_at")
    .gte("viewed_at", previousStart.toISOString());

  const views = (data ?? []) as Array<{ post_id: string; viewed_at: string }>;
  
  const currentViews = views.filter(v => new Date(v.viewed_at) >= currentStart);
  const previousViews = views.filter(v => new Date(v.viewed_at) < currentStart && new Date(v.viewed_at) >= previousStart);

  const counts = new Map<string, number>();
  for (const view of currentViews) {
    counts.set(view.post_id, (counts.get(view.post_id) ?? 0) + 1);
  }

  const dailyMap = new Map<string, number>();
  for (const view of currentViews) {
    const day = new Date(view.viewed_at).toISOString().split('T')[0];
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  const dailyData: number[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const dayStr = date.toISOString().split('T')[0];
    dailyData.unshift(dailyMap.get(dayStr) ?? 0);
  }

  const trend = previousViews.length === 0 ? 100 : ((currentViews.length - previousViews.length) / previousViews.length) * 100;

  const withViews = posts.map((post) => ({ post, views: counts.get(post.id) ?? 0 }));
  const mostReadPosts = withViews
    .filter((item) => item.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((item) => ({ title: item.post.title, slug: item.post.slug, views: item.views }));

  const recentPosts = posts
    .filter(p => p.status === 'published' || p.status === 'approved')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .slice(0, 5)
    .map(p => ({ title: p.title, slug: p.slug }));

  const topicMap = new Map<string, number>();
  for (const item of withViews) {
    for (const tag of [item.post.category, ...item.post.tags]) {
      topicMap.set(tag, (topicMap.get(tag) ?? 0) + item.views);
    }
  }

  const { count: absoluteTotal } = await getSupabaseAdmin().from("portal_page_views").select("id", { count: "exact", head: true });

  const topics = [...topicMap.entries()].map(([topic, views]) => ({ topic, views }));
  return {
    totalViews: currentViews.length,
    absoluteTotal: absoluteTotal ?? 0,
    previousViews: previousViews.length,
    trendPercentage: Math.round(trend),
    dailyData,
    mostReadPosts,
    recentPosts,
    mostReadTopics: topics.filter((topic) => topic.views > 0).sort((a, b) => b.views - a.views).slice(0, 5),
    leastReadTopics: topics.sort((a, b) => a.views - b.views).slice(0, 5)
  };
}
