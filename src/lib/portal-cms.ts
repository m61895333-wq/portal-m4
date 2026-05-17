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
  image_prompt?: string | null;
  category: string;
  tags: string[];
  status: PostStatus;
  priority: number;
  scheduled_at: string | null;
  published_at: string | null;
  reviewer_notes: string | null;
  source_topic?: string | null;
  editorial_angle?: string | null;
  visual_fingerprint?: string | null;
  content_fingerprint?: string | null;
  source_urls?: string[] | null;
  source_titles?: string[] | null;
  factual_notes?: string | null;
  generation_provider?: string | null;
  generation_model?: string | null;
  editorial_score?: number | null;
  editorial_audit?: PortalPost["editorialAudit"] | null;
  editorial_revision_count?: number | null;
  reviewed_at?: string | null;
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
    imagePrompt: row.image_prompt ?? null,
    category: row.category,
    tags: row.tags ?? [],
    status: row.status,
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    reviewerNotes: row.reviewer_notes,
    sourceTopic: row.source_topic ?? null,
    editorialAngle: row.editorial_angle ?? null,
    visualFingerprint: row.visual_fingerprint ?? null,
    contentFingerprint: row.content_fingerprint ?? null,
    sourceUrls: row.source_urls ?? null,
    sourceTitles: row.source_titles ?? null,
    factualNotes: row.factual_notes ?? null,
    generationProvider: row.generation_provider ?? null,
    generationModel: row.generation_model ?? null,
    editorialScore: row.editorial_score ?? null,
    editorialAudit: row.editorial_audit ?? null,
    editorialRevisionCount: row.editorial_revision_count ?? 0,
    reviewedAt: row.reviewed_at ?? null,
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
    image_prompt: post.imagePrompt,
    category: post.category,
    tags: post.tags,
    status: post.status,
    priority: post.priority,
    scheduled_at: post.scheduledAt,
    published_at: post.publishedAt,
    reviewer_notes: post.reviewerNotes,
    source_topic: post.sourceTopic,
    editorial_angle: post.editorialAngle,
    visual_fingerprint: post.visualFingerprint,
    content_fingerprint: post.contentFingerprint,
    source_urls: post.sourceUrls,
    source_titles: post.sourceTitles,
    factual_notes: post.factualNotes,
    generation_provider: post.generationProvider,
    generation_model: post.generationModel,
    editorial_score: post.editorialScore,
    editorial_audit: post.editorialAudit,
    editorial_revision_count: post.editorialRevisionCount,
    reviewed_at: post.reviewedAt,
    is_active: post.isActive
  };
}

const CURATION_STOPWORDS = new Set([
  "a", "agora", "ao", "aos", "as", "ate", "brasil", "brasileiro", "brasileira", "com", "como", "da", "das",
  "de", "do", "dos", "e", "em", "entre", "isso", "mais", "mercado", "na", "nas", "no", "nos", "o", "os",
  "ou", "para", "pela", "pelo", "por", "que", "se", "sobre", "sua", "tendencia", "tendencias", "um", "uma"
]);

function normalizeForCuration(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeForCuration(value)
    .replace(/ /g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "pauta-premium-m4";
}

function extractBaseTopic(topic: string) {
  return topic
    .split(/\s[—-]\s|\s\|\s|:/)[0]
    .replace(/^artigo\s+(epico|premium|de capa)\s*/i, "")
    .trim() || topic.trim();
}

function significantWords(value: string) {
  return normalizeForCuration(value)
    .split(" ")
    .filter((word) => word.length > 3 && !CURATION_STOPWORDS.has(word));
}

function similarityScore(a: string, b: string) {
  const left = new Set(significantWords(a));
  const right = new Set(significantWords(b));
  if (left.size < 2 || right.size < 2) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function buildEditorialBrief(input: {
  topic: string;
  sourceTopic: string;
  editorialAngle: string;
  audience?: string;
  visualDirection?: string;
}) {
  return [
    "PAUTA PREMIUM M4",
    `Assunto-base: ${input.sourceTopic}`,
    `Angulo editorial: ${input.editorialAngle}`,
    `Publico-alvo: ${input.audience || "leitor brasileiro amplo, de diferentes classes sociais, com linguagem clara e premium"}`,
    "Contrato editorial:",
    "- O artigo deve ser unico, com tese propria e exemplos concretos.",
    "- O texto deve combinar autoridade, clareza e utilidade pratica.",
    "- A explicacao deve servir tanto ao leitor iniciante quanto ao leitor sofisticado.",
    "- Evitar repeticao de estrutura, titulo, subtitulo e analogias de artigos anteriores.",
    `Direcao visual: ${input.visualDirection || "capa editorial fotorrealista premium, sem texto, sem pessoas identificaveis, com atmosfera de tecnologia, negocios e mercado"}`
  ].join("\n");
}

const VISUAL_PROFILES: Record<string, string> = {
  "MERCADO FINANCEIRO": "Brazilian financial market context, interest rates, currency, B3 trading signals, macroeconomic dashboards",
  "INVESTIMENTOS": "personal investment planning, portfolio allocation, fixed income and equity signals, premium financial desk",
  "INTELIGENCIA ARTIFICIAL": "AI infrastructure, neural network visualization, automation systems, human-scale technology environment",
  "TECNOLOGIA": "digital infrastructure, cloud systems, cybersecurity, product analytics and modern software operations",
  "CARREIRA": "professional transformation, hiring market, skill development, executive workspace without identifiable faces",
  "EMPREENDEDORISMO": "founder strategy, startup operations, growth dashboard, premium business planning table",
  "EDUCACAO FINANCEIRA": "family financial planning, budget organization, accessible premium home office, everyday money decisions",
  "GERAL": "Brazilian business, technology and economy context, premium editorial analysis"
};

export function buildContextualVisualPrompt(input: {
  title: string;
  excerpt?: string | null;
  sourceTopic?: string | null;
  editorialAngle?: string | null;
  category?: string | null;
  visualDirection?: string | null;
}) {
  const context = [
    input.title,
    input.excerpt,
    input.sourceTopic,
    input.editorialAngle,
    input.category
  ].filter(Boolean).join(" ");
  const keywords = [...new Set(significantWords(context))]
    .filter((word) => !["artigo", "analise", "premium", "portal"].includes(word))
    .slice(0, 10)
    .join(", ");
  const profile = VISUAL_PROFILES[input.category || "GERAL"] || VISUAL_PROFILES.GERAL;
  const direction = input.visualDirection || profile;

  return [
    "Premium photorealistic editorial cover for Portal M4.",
    `Specific article context: ${input.title}.`,
    input.excerpt ? `Editorial thesis: ${input.excerpt}.` : "",
    input.editorialAngle ? `Angle to represent visually: ${input.editorialAngle}.` : "",
    `Visual scene: ${direction}.`,
    keywords ? `Concept keywords to preserve: ${keywords}.` : "",
    "Composition: realistic Brazilian business/economy/technology atmosphere, elegant lighting, sharp focus, high-end magazine cover.",
    "Strict constraints: no text, no logo, no watermark, no readable UI labels, no identifiable faces, no generic random office."
  ].filter(Boolean).join(" ");
}

type EditorialCheck = {
  key: string;
  label: string;
  passed: boolean;
  points: number;
  detail: string;
};

function wordCount(value: string) {
  return normalizeForCuration(value).split(" ").filter(Boolean).length;
}

function countMatches(value: string, pattern: RegExp) {
  return (value.match(pattern) ?? []).length;
}

function hasMetadataLeak(content: string) {
  return /(^|\n)\s*(TITULO_FINAL|SUBTITULO_SEO|EXCERPT|HASHTAGS|KEYWORDS|IMAGE_PROMPT)\s*:/i.test(content);
}

function isInstitutionalOrGenericTopic(value: string) {
  const normalized = normalizeForCuration(value);
  const genericPatterns = [
    /portal m4/,
    /grupo m4/,
    /inteligencia financeira tecnologia e ia/,
    /decidir melhor/,
    /bem vindo/,
    /sobre o portal/,
    /conteudo premium/,
    /analise exclusiva o futuro de/,
    /tendencias de mercado$/,
    /artigo premium/,
    /guia completo/
  ];
  return genericPatterns.some((pattern) => pattern.test(normalized));
}

function hasPublicImpact(value: string) {
  return /(familia|familias|trabalhador|trabalhadores|emprego|salario|renda|consumidor|consumidores|investidor|investidores|aposentadoria|credito|divida|juros|inflacao|ipca|selic|empresa|empresas|pequenos negocios|empreendedor|seguranca|educacao|moradia|custo de vida|classe media|baixa renda|patrimonio)/i.test(value);
}

function hasActionableDepth(value: string) {
  const signals = [
    /o que muda/i,
    /quem ganha/i,
    /quem perde/i,
    /como se proteger/i,
    /como aproveitar/i,
    /riscos?/i,
    /oportunidades?/i,
    /proximos? meses/i,
    /cenario base/i,
    /cenario otimista/i,
    /cenario de estresse/i,
    /decisao/i,
    /estrategia/i
  ];
  return signals.filter((pattern) => pattern.test(value)).length >= 3;
}

function contentSimilarityScore(a: string, b: string) {
  const left = new Set(significantWords(a).slice(0, 220));
  const right = new Set(significantWords(b).slice(0, 220));
  if (left.size < 40 || right.size < 40) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function runEditorialAudit(post: PortalPost, recentTitles: string[] = [], recentContents: string[] = []) {
  const title = post.title.trim();
  const excerpt = post.excerpt.trim();
  const content = post.content.trim();
  const editorialContext = `${title} ${excerpt} ${content} ${post.sourceTopic ?? ""} ${post.editorialAngle ?? ""}`;
  const words = wordCount(content);
  const headings = countMatches(content, /^##\s+.+/gm);
  const paragraphs = content.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 80 && !line.startsWith("##")).length;
  const dataPoints = countMatches(content, /(\b20\d{2}\b|\b\d+[,.]?\d*\s?%|R\$\s?\d+|US\$\s?\d+|\bSelic\b|\bIPCA\b|\bPIB\b)/gi);
  const sourceSignals = countMatches(content, /(Banco Central|IBGE|FMI|Reuters|Bloomberg|Deloitte|McKinsey|Gartner|XP|B3|Anbima|CVM|Febraban)/gi);
  const practicalSignals = countMatches(content, /(exemplo|na pratica|estrategia|risco|oportunidade|cenario|decisao|investidor|profissional|familia|empresa)/gi);
  const bannedOpenings = /^(nos ultimos anos|em um cenario|no contexto atual|com o avanco|e importante|neste artigo)/i.test(normalizeForCuration(content.slice(0, 120)));
  const duplicateTitle = recentTitles.some((existing) => similarityScore(title, existing) >= 0.52 || normalizeForCuration(title) === normalizeForCuration(existing));
  const maxContentSimilarity = Math.max(0, ...recentContents.map((existing) => contentSimilarityScore(content, existing)));
  const genericOrInstitutional = isInstitutionalOrGenericTopic(`${title} ${excerpt} ${post.sourceTopic ?? ""}`);
  const publicImpact = hasPublicImpact(editorialContext);
  const actionableDepth = hasActionableDepth(editorialContext);
  const imageLooksUnique = Boolean(post.imageUrl && post.imageUrl.includes("seed=") && !post.imageUrl.includes("images.unsplash.com/photo-1611974714658"));
  const visualContext = `${post.title} ${post.excerpt} ${post.sourceTopic ?? ""} ${post.editorialAngle ?? ""} ${post.category ?? ""}`;
  const imagePrompt = post.imagePrompt ?? "";
  const imageContextScore = similarityScore(imagePrompt, visualContext);
  const imagePromptLooksSpecific = imagePrompt.length >= 120 && significantWords(imagePrompt).length >= 10 && !/(generic|abstract|random|office only|stock photo)/i.test(imagePrompt);

  const checks: EditorialCheck[] = [
    {
      key: "title",
      label: "Titulo jornalistico, concreto e exclusivo",
      passed: title.length >= 55 && title.length <= 125 && !duplicateTitle && !genericOrInstitutional && !/[#*_`]/.test(title),
      points: 12,
      detail: `${title.length} caracteres${duplicateTitle ? "; similar a titulo recente" : ""}${genericOrInstitutional ? "; pauta institucional/generica" : ""}`
    },
    {
      key: "relevance",
      label: "Relevancia social, economica ou profissional real",
      passed: publicImpact && actionableDepth,
      points: 14,
      detail: `${publicImpact ? "impacto publico detectado" : "sem impacto publico claro"}; ${actionableDepth ? "profundidade acionavel" : "sem decisao pratica suficiente"}`
    },
    {
      key: "originality",
      label: "Originalidade de tese e corpo editorial",
      passed: maxContentSimilarity < 0.28,
      points: 10,
      detail: `similaridade maxima ${Math.round(maxContentSimilarity * 100)}%`
    },
    {
      key: "excerpt",
      label: "Resumo SEO suficiente e sem sujeira de prompt",
      passed: excerpt.length >= 120 && excerpt.length <= 260 && !hasMetadataLeak(excerpt),
      points: 8,
      detail: `${excerpt.length} caracteres`
    },
    {
      key: "depth",
      label: "Profundidade editorial minima",
      passed: words >= 1100,
      points: 16,
      detail: `${words} palavras`
    },
    {
      key: "structure",
      label: "Estrutura com secoes e boa escaneabilidade",
      passed: headings >= 4 && paragraphs >= 8,
      points: 12,
      detail: `${headings} subtitulos e ${paragraphs} paragrafos substanciais`
    },
    {
      key: "evidence",
      label: "Dados, datas, percentuais ou valores suficientes",
      passed: dataPoints >= 5 && sourceSignals >= 2,
      points: 12,
      detail: `${dataPoints} sinais numericos e ${sourceSignals} fontes citadas`
    },
    {
      key: "accessibility",
      label: "Linguagem premium acessivel ao publico amplo",
      passed: practicalSignals >= 8 && !bannedOpenings,
      points: 10,
      detail: `${practicalSignals} sinais praticos${bannedOpenings ? "; abertura generica detectada" : ""}`
    },
    {
      key: "cleanliness",
      label: "Texto limpo, sem blocos tecnicos ou artefatos",
      passed: !hasMetadataLeak(content) && !/\*\*|```|\[.+\]/.test(content.slice(0, 1000)),
      points: 10,
      detail: hasMetadataLeak(content) ? "metadados internos vazaram no texto" : "sem vazamento tecnico aparente"
    },
    {
      key: "image",
      label: "Imagem premium, unica e aderente ao contexto",
      passed: imageLooksUnique && Boolean(post.visualFingerprint) && imagePromptLooksSpecific,
      points: 12,
      detail: imageLooksUnique
        ? `brief visual ${imagePromptLooksSpecific ? "contextual" : "insuficiente"}; aderencia ${Math.round(imageContextScore * 100)}%`
        : "imagem sem seed unico ou placeholder detectado"
    }
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const blockers = checks.filter((check) => !check.passed).map((check) => `${check.label}: ${check.detail}`);
  return {
    score,
    passed: score >= 82 && blockers.length === 0,
    checks,
    blockers,
    auditedAt: new Date().toISOString()
  };
}

export const fallbackPost: PortalPost = {
  id: "fallback-1",
  slug: "selic-renda-fixa-e-custo-de-vida-para-familias-brasileiras",
  title: "Selic, renda fixa e custo de vida: o que muda para familias brasileiras",
  excerpt: "Juros altos alteram credito, investimentos e consumo. A analise mostra riscos e decisoes praticas para proteger renda e patrimonio.",
  content: "## Contexto\n\nConteudo editorial temporario exibido apenas quando o banco nao esta configurado.",
  imageUrl: "https://images.unsplash.com/photo-1611974714658-058f40da23fb?q=80&w=2070&auto=format&fit=crop",
  imagePrompt: null,
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
    .eq("status", "published")
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

export async function getPostById(id: string) {
  noStore();
  if (!hasSupabaseConfig()) return id === fallbackPost.id ? fallbackPost : null;

  const { data, error } = await getSupabaseAdmin().from("portal_posts").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromDb(data as DbPost);
}

export async function auditPostForPublication(id: string) {
  if (!hasSupabaseConfig()) throw new Error("Supabase nao configurado.");

  const post = await getPostById(id);
  if (!post) throw new Error("Artigo nao encontrado.");

  const { data } = await getSupabaseAdmin()
    .from("portal_posts")
    .select("title, content")
    .neq("id", id)
    .neq("status", "rejected")
    .order("updated_at", { ascending: false })
    .limit(80);

  const recentRows = (data ?? []) as Array<{ title: string; content?: string | null }>;
  const recentTitles = recentRows.map((row) => row.title);
  const recentContents = recentRows.map((row) => row.content || "").filter(Boolean);
  const audit = runEditorialAudit(post, recentTitles, recentContents);

  await updatePost(id, {
    editorialScore: audit.score,
    editorialAudit: audit,
    reviewedAt: audit.auditedAt,
    reviewerNotes: [
      post.reviewerNotes || "",
      "",
      `AUDITORIA EDITORIAL M4 (${audit.auditedAt})`,
      `Nota: ${audit.score}/100`,
      audit.passed ? "Resultado: APROVADO PARA PUBLICACAO" : "Resultado: BLOQUEADO PARA REVISAO",
      ...audit.blockers.map((blocker) => `- ${blocker}`)
    ].join("\n").trim()
  });

  return audit;
}

export async function sendPublicationNotification(post: PortalPost) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PORTAL_M4_NOTIFY_EMAIL;
  if (!apiKey || !to) {
    console.log("[EMAIL] Notificacao de publicacao nao configurada.");
    return false;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://portalm4.com.br").replace(/\/$/, "");
  const from = process.env.PORTAL_M4_NOTIFY_FROM || "Portal M4 <onboarding@resend.dev>";
  const url = `${siteUrl}/artigo/${post.slug}`;
  const score = post.editorialScore ?? post.editorialAudit?.score ?? "sem nota";
  const publishedAt = post.publishedAt || new Date().toISOString();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Portal M4 publicou: ${post.title.slice(0, 90)}`,
        html: `
          <h2>Artigo publicado no Portal M4</h2>
          <p><strong>${post.title}</strong></p>
          <p><strong>Nota editorial:</strong> ${score}/100</p>
          <p><strong>Tentativas:</strong> ${post.editorialRevisionCount ?? 0}</p>
          <p><strong>Publicado em:</strong> ${publishedAt}</p>
          <p>${post.excerpt}</p>
          <p><a href="${url}">Abrir artigo publicado</a></p>
        `,
        text: [
          "Artigo publicado no Portal M4",
          post.title,
          `Nota editorial: ${score}/100`,
          `Tentativas: ${post.editorialRevisionCount ?? 0}`,
          `Publicado em: ${publishedAt}`,
          url,
          post.excerpt
        ].join("\n")
      })
    });
    if (!response.ok) {
      console.error("[EMAIL] Falha Resend:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[EMAIL] Erro ao enviar notificacao:", error);
    return false;
  }
}

export async function publishPostNow(id: string) {
  const post = await getPostById(id);
  if (!post) throw new Error("Artigo nao encontrado.");
  if (!["review", "analysis", "published"].includes(post.status)) {
    throw new Error("Publicacao bloqueada: o artigo precisa estar em Revisao ou Analise Final.");
  }

  const audit = await auditPostForPublication(id);
  if (!audit.passed) {
    const result = await requeuePostForEditorialRevision(id, "Publicacao bloqueada pela Auditoria M4.", audit);
    throw new Error(
      `Publicacao reprovada. Nota ${audit.score}/100. ${
        result.requeued ? "O artigo voltou para a fila para ser refeito." : "Limite de retrabalho atingido; artigo rejeitado."
      } ${audit.blockers[0] || ""}`.trim()
    );
  }

  const publishedAt = new Date().toISOString();
  const published = await updatePost(id, {
    status: "published",
    publishedAt,
    editorialScore: audit.score,
    editorialAudit: audit,
    reviewedAt: audit.auditedAt
  });
  await sendPublicationNotification(published);
  return published;
}

export async function unpublishPost(id: string) {
  const post = await getPostById(id);
  if (!post) throw new Error("Artigo nao encontrado.");
  return updatePost(id, {
    status: "draft",
    publishedAt: null,
    reviewerNotes: [
      post.reviewerNotes || "",
      "",
      `PUBLICACAO SUSPENSA M4 (${new Date().toISOString()})`,
      "Artigo removido do ar manualmente pelo painel."
    ].join("\n").trim()
  });
}

export async function publishDueScheduledPosts(now = new Date()) {
  if (!hasSupabaseConfig()) return { published: 0, requeued: 0, rejected: 0, skipped: 0, details: [] as string[] };

  const nowIso = now.toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("portal_posts")
    .select("*")
    .in("status", ["review", "analysis", "approved"])
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .eq("is_active", true)
    .order("published_at", { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);

  let published = 0;
  let requeued = 0;
  let rejected = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const row of (data ?? []) as DbPost[]) {
    const post = fromDb(row);
    try {
      const audit = await auditPostForPublication(post.id);
      if (!audit.passed) {
        const result = await requeuePostForEditorialRevision(post.id, "Publicacao agendada bloqueada pela Auditoria M4.", audit);
        if (result.requeued) requeued += 1;
        if (result.rejected) rejected += 1;
        details.push(`${post.title}: bloqueado pela auditoria (${audit.score}/100)`);
        continue;
      }

      await updatePost(post.id, {
        status: "published",
        publishedAt: nowIso,
        editorialScore: audit.score,
        editorialAudit: audit,
        reviewedAt: audit.auditedAt,
        reviewerNotes: [
          post.reviewerNotes || "",
          "",
          `PUBLICACAO AUTOMATICA M4 (${nowIso})`,
          "Horario programado alcancado e auditoria aprovada."
        ].join("\n").trim()
      });
      const publishedPost = await getPostById(post.id);
      if (publishedPost) await sendPublicationNotification(publishedPost);
      published += 1;
      details.push(`${post.title}: publicado automaticamente`);
    } catch (err: any) {
      skipped += 1;
      details.push(`${post.title}: erro ${err?.message || "desconhecido"}`);
    }
  }

  return { published, requeued, rejected, skipped, details };
}

export async function requeuePostForEditorialRevision(
  id: string,
  reason: string,
  audit?: ReturnType<typeof runEditorialAudit>
) {
  const post = await getPostById(id);
  if (!post) throw new Error("Artigo nao encontrado.");

  const nextRevision = (post.editorialRevisionCount ?? 0) + 1;
  const timestamp = new Date().toISOString();
  const blockers = audit?.blockers?.length ? audit.blockers.map((item) => `- ${item}`).join("\n") : `- ${reason}`;
  const previousNotes = post.reviewerNotes ? `${post.reviewerNotes}\n\n` : "";
  const normalizedContent = normalizeForCuration(post.content || "");
  const canPolishExisting =
    normalizedContent.split(" ").length >= 650 &&
    !normalizedContent.includes("refazendo artigo automaticamente") &&
    !normalizedContent.includes("gerando artigo premium") &&
    !normalizedContent.includes("aguardando reprocessamento");

  await updatePost(id, {
    status: "queued",
    content: canPolishExisting ? post.content : "Refazendo artigo automaticamente apos reprovar na Auditoria Editorial M4...",
    excerpt: canPolishExisting ? post.excerpt : "Artigo voltou para a fila para refacao automatica.",
    editorialRevisionCount: nextRevision,
    editorialScore: audit?.score ?? post.editorialScore ?? null,
    editorialAudit: audit ?? post.editorialAudit ?? null,
    reviewedAt: timestamp,
    reviewerNotes: [
      previousNotes,
      `RETRABALHO AUTOMATICO M4 (${timestamp})`,
      `Tentativa: ${nextRevision}`,
      canPolishExisting
        ? "Resultado: artigo retornou para a fila e sera lapidado pelo worker preservando a pesquisa original."
        : "Resultado: artigo retornou para a fila e sera refeito pelo worker ate ser aprovado e publicado.",
      "Motivos:",
      blockers
    ].join("\n").trim()
  });

  return {
    requeued: true,
    rejected: false,
    revisionCount: nextRevision
  };
}

export async function listCategoryPosts(categorySlug: string) {
  const posts = await listPublicPosts();

  // Mapa explícito: valor do banco → slug do frontend (espelho do categories.ts)
  const DB_TO_SLUG: Record<string, string> = {
    'MERCADO FINANCEIRO':      'mercado-financeiro',
    'INVESTIMENTOS':           'investimentos',
    'INTELIGENCIA ARTIFICIAL': 'inteligencia-artificial',
    'TECNOLOGIA':              'tecnologia-negocios-digitais',
    'CARREIRA':                'carreira-ia',
    'EMPREENDEDORISMO':        'empreendedorismo-digital',
    'EDUCACAO FINANCEIRA':     'educacao-financeira',
    'IA & MERCADO':            'inteligencia-artificial',
    'IA E MERCADO':            'inteligencia-artificial',
    'GERAL':                   'mercado-financeiro',
  };

  return posts.filter((post) => {
    // Tenta o mapa explícito primeiro
    const mapped = DB_TO_SLUG[post.category.toUpperCase().trim()];
    if (mapped) return mapped === categorySlug;

    // Fallback: normaliza para slug genérico
    const slug = post.category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug === categorySlug;
  });
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
export async function createQueuedPost(input: {
  topic: string;
  scheduledAt?: string;
  sourceTopic?: string;
  editorialAngle?: string;
  audience?: string;
  visualDirection?: string;
}) {
  if (!hasSupabaseConfig()) throw new Error("Supabase não configurado.");

  const sourceTopic = (input.sourceTopic || extractBaseTopic(input.topic)).trim();
  const editorialAngle = (input.editorialAngle || "Analise estrategica exclusiva").trim();
  const editorialKey = `${sourceTopic} ${editorialAngle}`;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existingPostsRaw } = await getSupabaseAdmin()
    .from("portal_posts")
    .select("id, title, status, source_topic, editorial_angle, reviewer_notes")
    .gte("created_at", ninetyDaysAgo)
    .neq("status", "rejected")
    .limit(250);

  const existingPosts = (existingPostsRaw ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    source_topic?: string | null;
    editorial_angle?: string | null;
    reviewer_notes?: string | null;
  }>;

  const duplicate = existingPosts.find((post) => {
    const sameStructuredIdea =
      normalizeForCuration(post.source_topic || "") === normalizeForCuration(sourceTopic) &&
      normalizeForCuration(post.editorial_angle || "") === normalizeForCuration(editorialAngle);
    const titleSimilarity = similarityScore(editorialKey, post.title);
    const structuredSimilarity = similarityScore(editorialKey, `${post.source_topic || ""} ${post.editorial_angle || ""}`);
    return sameStructuredIdea || titleSimilarity >= 0.62 || structuredSimilarity >= 0.62;
  });

  if (duplicate) {
    throw new Error(
      `CURADORIA M4: Artigo similar já existe na base (${duplicate.status.toUpperCase()}): "${duplicate.title}". Escolha um ângulo mais específico ou uma tese diferente.`
    );
  }

  const slug = `pauta-${Date.now()}-${slugify(`${sourceTopic}-${editorialAngle}`)}`;
  const visualFingerprint = `${normalizeForCuration(sourceTopic)}|${normalizeForCuration(editorialAngle)}|${Date.now()}`;

  const placeholderSeed = Date.now() + Math.floor(Math.random() * 99991);
  const imagePrompt = buildContextualVisualPrompt({
    title: `${sourceTopic} | ${editorialAngle}`,
    sourceTopic,
    editorialAngle,
    category: "GERAL",
    visualDirection: input.visualDirection
  });
  const placeholderPrompt = encodeURIComponent(imagePrompt);
  const placeholderImageUrl = `https://image.pollinations.ai/prompt/${placeholderPrompt}?width=1400&height=800&nologo=true&seed=${placeholderSeed}`;
  const reviewerNotes = buildEditorialBrief({
    topic: input.topic,
    sourceTopic,
    editorialAngle,
    audience: input.audience,
    visualDirection: input.visualDirection
  });

  const postData = {
    title: `${sourceTopic} | ${editorialAngle}`,
    slug: slug,
    content: "Gerando artigo premium na VPS...",
    excerpt: "Pauta premium aguardando processamento editorial.",
    category: "GERAL",
    status: "queued" as PostStatus,
    priority: 1,
    imageUrl: placeholderImageUrl,
    imagePrompt,
    scheduledAt: input.scheduledAt,
    reviewerNotes,
    sourceTopic,
    editorialAngle,
    visualFingerprint,
    editorialRevisionCount: 0,
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
    .filter(p => p.status === 'published')
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
