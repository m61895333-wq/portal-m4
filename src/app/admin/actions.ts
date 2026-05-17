"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addTopicTag,
  auditPostForPublication,
  buildContextualVisualPrompt,
  createQueuedPost,
  deletePost,
  getPostById,
  publishPostNow,
  requeuePostForEditorialRevision,
  removeTopicTag,
  sendPublicationNotification,
  unpublishPost,
  updatePost,
  setAutonomyStatus,
  recordPageView
} from "@/lib/portal-cms";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import type { PortalPost, PostStatus } from "@/lib/types";

function revalidatePortal() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function loginFormAction(formData: FormData) {
  const ok = await signInAdmin(formData);
  if (ok) redirect("/admin");
  redirect("/admin?erro=login");
}

export async function logoutAction() {
  await signOutAdmin();
  redirect("/admin");
}

export async function savePostAction(formData: FormData) {
  const id = String(formData.get("id"));
  let success = false;
  let errorMsg = "";
  try {
    const currentPost = await getPostById(id);
    if (!currentPost) throw new Error("Artigo nao encontrado.");
    const updates: Partial<PortalPost> = {};
    const editorialFieldsChanged =
      formData.has("title") ||
      formData.has("content") ||
      formData.has("excerpt") ||
      formData.has("imageUrl") ||
      formData.has("tags") ||
      formData.has("category");

    if (formData.has("title")) updates.title = String(formData.get("title") || "").replace(/\*/g, "").trim();
    if (formData.has("content")) updates.content = String(formData.get("content") || "").replace(/\*/g, "").trim();
    if (formData.has("excerpt")) updates.excerpt = String(formData.get("excerpt") || "").replace(/\*/g, "").trim();
    if (formData.has("slug")) updates.slug = String(formData.get("slug") || "");
    if (formData.has("imageUrl")) updates.imageUrl = String(formData.get("imageUrl") || "");
    if (formData.has("category")) updates.category = String(formData.get("category") || "");
    if (formData.has("tags")) updates.tags = String(formData.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean);
    if (formData.has("priority")) updates.priority = Number(formData.get("priority") || 50);
    if (formData.has("scheduledAt")) updates.scheduledAt = String(formData.get("scheduledAt") || "") || null;
    if (formData.has("publishedAt")) updates.publishedAt = String(formData.get("publishedAt") || "") || null;
    if (formData.has("isActive")) updates.isActive = formData.get("isActive") === "on";

    if (editorialFieldsChanged) {
      updates.editorialScore = null;
      updates.editorialAudit = null;
      updates.reviewedAt = null;
      updates.reviewerNotes = [
        currentPost.reviewerNotes || "",
        "",
        `EDICAO MANUAL M4 (${new Date().toISOString()})`,
        "Auditoria anterior invalidada. O artigo precisa passar novamente pela Auditoria Editorial M4 antes de publicar."
      ].join("\n").trim();

      if (["analysis", "approved", "published"].includes(currentPost.status)) {
        updates.status = "review";
        updates.publishedAt = null;
      }
    }

    const updated = await updatePost(id, updates);
    if (status === "published") {
      await sendPublicationNotification(updated);
    }
    revalidatePortal();
    success = true;
  } catch (err: any) {
    errorMsg = err.message;
  }
  if (success) redirect("/admin?sucesso=salvo");
  else redirect("/admin?erro=salvamento&msg=" + encodeURIComponent(errorMsg));
}

export async function createSingleDraftAction(formData: FormData) {
  const topic = formData.get("topic") as string;
  const sourceUrl = formData.get("sourceUrl") as string;
  const scheduledAt = formData.get("scheduledAt") as string;
  const index = formData.get("index") as string;

  const finalTopic = topic || sourceUrl || "Tendencias de Mercado";

  try {
    const result = await createQueuedPost({
      topic: finalTopic,
      scheduledAt
    });
    return { success: true, id: result.id };
  } catch (err: any) {
    console.error(`[ESTEIRA] Falha ao enfileirar artigo ${index}:`, err);
    return { success: false, error: err.message || "Erro ao conectar com a fila da VPS." };
  }
}

const PREMIUM_BATCH_ANGLES = [
  { title: "impacto no bolso do investidor brasileiro", audience: "investidores iniciantes e experientes que precisam decidir com clareza", visual: "premium financial desk, Brazilian market context, clean charts, cinematic editorial photography" },
  { title: "efeitos para empresas, empregos e renda", audience: "profissionais, empreendedores e familias que querem entender consequencias praticas", visual: "modern Brazilian business district, diverse professional context without identifiable faces, premium editorial look" },
  { title: "riscos, oportunidades e sinais que poucos estao observando", audience: "leitores que buscam analise antecipada, sem linguagem inacessivel", visual: "high-end newsroom data wall, subtle risk indicators, cinematic business technology atmosphere" },
  { title: "comparativo Brasil versus mundo", audience: "leitores que querem situar o Brasil no cenario global", visual: "global finance map, Sao Paulo skyline impression, realistic premium editorial photography" },
  { title: "guia pratico para tomada de decisao nos proximos 12 meses", audience: "publico amplo, de todas as classes sociais, que precisa transformar informacao em acao", visual: "premium planning table with financial reports, smartphone, notebook, clean light, no text" },
  { title: "o que muda para tecnologia, IA e negocios digitais", audience: "profissionais de tecnologia, empreendedores digitais e investidores em inovacao", visual: "advanced AI operations room, luxury technology office, photorealistic editorial cover" },
  { title: "educacao financeira para proteger patrimonio e renda", audience: "familias, trabalhadores e pequenos investidores que precisam de clareza sem simplismo", visual: "elegant home office financial planning scene, premium accessible atmosphere, no people" },
  { title: "cenario-base, cenario otimista e cenario de estresse", audience: "leitores que desejam planejamento por cenarios com linguagem objetiva", visual: "three scenario dashboards in premium strategy room, cinematic financial editorial photography" },
  { title: "bastidores regulatorios e seguranca para o consumidor", audience: "leitores preocupados com confianca, regulacao e protecao financeira", visual: "secure digital finance infrastructure, glass office, subtle compliance atmosphere, realistic" },
  { title: "tendencias premium que podem definir a proxima decada", audience: "leitores sofisticados que procuram visao de longo prazo com clareza", visual: "futuristic premium city and finance technology composition, realistic editorial photography" }
];

export async function createEditorialBatchAction(formData: FormData) {
  const topic = String(formData.get("topic") || "").trim();
  const count = Math.min(Math.max(Number(formData.get("count") || 1), 1), PREMIUM_BATCH_ANGLES.length);
  const scheduledAt = String(formData.get("scheduledAt") || "") || undefined;

  if (!topic) return { success: false, created: 0, error: "Informe um assunto-base." };

  const results: Array<{ id: string; title: string }> = [];
  const errors: string[] = [];
  const angles = PREMIUM_BATCH_ANGLES.slice(0, count);

  try {
    const firstAngle = angles[0];
    const post = await createQueuedPost({
      topic,
      sourceTopic: topic,
      editorialAngle: firstAngle.title,
      audience: firstAngle.audience,
      visualDirection: firstAngle.visual,
      scheduledAt
    });
    results.push({ id: post.id, title: post.title });
  } catch (err: any) {
    errors.push(`${angles[0]?.title || topic}: ${err.message || "falha ao enfileirar"}`);
  }

  if (results.length > 0) {
    await getSupabaseAdmin()
      .from("portal_settings")
      .upsert({
        key: "editorial_demand",
        value: {
          active: count > 1,
          topic,
          total: count,
          created: 1,
          scheduledAt: scheduledAt || null,
          angles
        },
        updated_at: new Date().toISOString()
      } as never);
  }

  revalidatePortal();
  return {
    success: results.length > 0,
    created: results.length,
    results,
    error: errors.join("\n"),
    pending: Math.max(count - results.length, 0)
  };
}

export async function setStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PostStatus;

  try {
    const currentPost = await getPostById(id);
    if (!currentPost) throw new Error("Artigo nao encontrado.");

    const updates: Partial<PortalPost> = { status };

    if (status === "analysis") {
      const audit = await auditPostForPublication(id);
      if (!audit.passed) {
        const result = await requeuePostForEditorialRevision(id, "Auditoria bloqueou a analise final.", audit);
        redirect(`/admin?status=queued&erro=auditoria&msg=${encodeURIComponent(`Auditoria reprovou o artigo. Nota ${audit.score}/100. Ele voltou para a fila e sera refeito automaticamente ate ser aprovado e publicado. Tentativa ${result.revisionCount}. ${audit.blockers[0] || ""}`)}`);
      }
      updates.editorialScore = audit.score;
      updates.editorialAudit = audit;
      updates.reviewedAt = audit.auditedAt;
    }

    if (status === "published") {
      if (!["analysis", "published"].includes(currentPost.status)) {
        redirect("/admin?erro=fluxo&msg=" + encodeURIComponent("Publicacao bloqueada: envie o artigo para Analise Final antes de publicar."));
      }

      const audit = await auditPostForPublication(id);
      if (!audit.passed) {
        const result = await requeuePostForEditorialRevision(id, "Publicacao bloqueada pela Auditoria M4.", audit);
        redirect(`/admin?status=queued&erro=auditoria&msg=${encodeURIComponent(`Publicacao reprovada. Nota ${audit.score}/100. O artigo voltou para a fila para ser refeito ate ser aprovado e publicado. Tentativa ${result.revisionCount}. ${audit.blockers[0] || ""}`)}`);
      }

      updates.publishedAt = new Date().toISOString();
      updates.editorialScore = audit.score;
      updates.editorialAudit = audit;
      updates.reviewedAt = audit.auditedAt;
    }

    await updatePost(id, updates);
    revalidatePortal();
  } catch (err: any) {
    if (String(err?.digest || err?.message).includes("NEXT_REDIRECT")) throw err;
    redirect("/admin?erro=status&msg=" + encodeURIComponent(err?.message || "Falha ao alterar status."));
  }
}

export async function togglePublicationAction(formData: FormData) {
  const id = String(formData.get("id"));

  try {
    const currentPost = await getPostById(id);
    if (!currentPost) throw new Error("Artigo nao encontrado.");

    if (currentPost.status === "published") {
      await unpublishPost(id);
      revalidatePortal();
      redirect("/admin?status=draft&sucesso=despublicado&msg=" + encodeURIComponent("Artigo despublicado e movido para Rascunho."));
    }

    await publishPostNow(id);
    revalidatePortal();
    redirect("/admin?status=published&sucesso=publicado&msg=" + encodeURIComponent("Artigo publicado com auditoria aprovada."));
  } catch (err: any) {
    if (String(err?.digest || err?.message).includes("NEXT_REDIRECT")) throw err;
    redirect("/admin?erro=publicacao&msg=" + encodeURIComponent(err?.message || "Falha ao alternar publicacao."));
  }
}
export async function deletePostAction(formData: FormData) {
  await deletePost(String(formData.get("id")));
  revalidatePortal();
}

export async function remakePostAction(formData: FormData) {
  const id = String(formData.get("id"));
  let success = false;
  try {
    await updatePost(id, {
      status: "queued",
      content: "Limpando rascunho anterior...",
      excerpt: "Artigo retornou para a fila para refacao completa.",
      editorialScore: null,
      editorialAudit: null,
      reviewedAt: null,
      reviewerNotes: [
        "RESGATE EDITORIAL ATIVO",
        `Solicitado manualmente em ${new Date().toISOString()}.`,
        "O worker deve reconstruir o artigo e passar novamente pela auditoria."
      ].join("\n")
    });
    revalidatePortal();
    success = true;
  } catch {}
  if (success) redirect("/admin?sucesso=resgate");
  else redirect("/admin?erro=resgate");
}

export async function remakeImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const currentPost = await getPostById(id);
  if (!currentPost) redirect("/admin?erro=imagem&msg=" + encodeURIComponent("Artigo nao encontrado."));
  const title = String(formData.get("title") || currentPost.title || "tecnologia");

  // Seed ÚNICO: timestamp em ms + número aleatório — nunca se repete
  const uniqueSeed = Date.now() + Math.floor(Math.random() * 999983);
  const imagePrompt = buildContextualVisualPrompt({
    title,
    excerpt: currentPost.excerpt,
    sourceTopic: currentPost.sourceTopic,
    editorialAngle: currentPost.editorialAngle,
    category: currentPost.category
  });
  const prompt = encodeURIComponent(imagePrompt);

  const actualUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1400&height=800&nologo=true&seed=${uniqueSeed}`;

  await updatePost(id, {
    imageUrl: actualUrl,
    imagePrompt,
    visualFingerprint: `manual-${uniqueSeed}`
  });
  revalidatePortal();
}

export async function toggleAutonomyAction(formData: FormData) {
  try {
    const actionType = formData.get("actionType");
    const currentStatus = formData.get("currentStatus") === "true";
    const nextStatus = actionType === "toggle" ? !currentStatus : currentStatus;
    const dailyCount = Number(formData.get("dailyCount") || 5);
    const startTime = String(formData.get("startTime") || "08:00");
    const activeDays = formData.getAll("activeDays") as string[];
    await setAutonomyStatus(nextStatus, dailyCount, startTime, activeDays);
    revalidatePortal();
  } catch {
    redirect("/admin?erro=autonomia");
  }
}

export async function addTagAction(formData: FormData) {
  await addTopicTag(String(formData.get("tag") || ""));
  revalidatePortal();
}

export async function removeTagAction(formData: FormData) {
  await removeTopicTag(String(formData.get("tag") || ""));
  revalidatePortal();
}

export async function recordHitAction(path: string) {
  try {
    await recordPageView(path);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function contactAction(formData: FormData) {
  try {
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const message = String(formData.get("message") ?? "");

    const { error } = await getSupabaseAdmin()
      .from("portal_contacts")
      .insert({ name, email, message } as never);

    if (error) {
      console.error("[CONTATO] Erro no banco:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("[CONTATO] Falha:", err);
    return { success: false };
  }
}
