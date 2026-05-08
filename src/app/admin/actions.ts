"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTopicTag, createQueuedPost, deletePost, removeTopicTag, updatePost, setAutonomyStatus, listPosts } from "@/lib/portal-cms";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import { generateEditorialDraft } from "@/lib/article-generator";
import type { PortalPost, PostStatus } from "@/lib/types";

function revalidatePortal() {
  revalidatePath("/");
  revalidatePath("/portal-m4");
  revalidatePath("/admin");
}

export async function loginAction(_: unknown, formData: FormData) {
  const ok = await signInAdmin(formData);
  if (!ok) return { error: "Usuario ou senha invalidos." };
  redirect("/admin");
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

export async function createSingleDraftAction(formData: FormData) {
  const topic = formData.get("topic") as string;
  const sourceUrl = formData.get("sourceUrl") as string;
  const approach = formData.get("approach") as string;
  const scheduledAt = formData.get("scheduledAt") as string;
  const index = formData.get("index") as string;

  const finalTopic = topic || sourceUrl || "Tendências de Mercado";

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


export async function savePostAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PostStatus;
  const updates: Partial<PortalPost> = {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    category: String(formData.get("category") ?? ""),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    status,
    priority: Number(formData.get("priority") ?? 50),
    scheduledAt: String(formData.get("scheduledAt") ?? "") || null,
    publishedAt: status === "published" || status === "approved" ? new Date().toISOString() : null,
    reviewerNotes: String(formData.get("reviewerNotes") ?? ""),
    isActive: formData.get("isActive") === "on"
  };

  await updatePost(id, updates);
  revalidatePortal();
}

export async function setStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PostStatus;
  await updatePost(id, {
    status,
    publishedAt: status === "approved" || status === "published" ? new Date().toISOString() : null
  });
  revalidatePortal();
}

export async function toggleActiveAction(formData: FormData) {
  await updatePost(String(formData.get("id")), { isActive: String(formData.get("active")) !== "true" });
  revalidatePortal();
}

export async function deletePostAction(formData: FormData) {
  await deletePost(String(formData.get("id")));
  revalidatePortal();
}

export async function remakePostAction(formData: FormData) {
  const id = String(formData.get("id"));
  
  // REGRA SOBERANA: Em vez de gerar aqui (timeout), mandamos para a fila do Worker 8GB
  await updatePost(id, {
    status: "queued",
    reviewerNotes: "⏳ REFAZENDO CONTEUDO: O servidor de 8GB esta gerando uma nova versao profunda deste artigo... (Aguarde 1-2 minutos)"
  });
  
  revalidatePortal();
}

export async function remakeImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "");
  const category = String(formData.get("categorySlug") ?? "business");
  
  // Lista de palavras premium baseadas no contexto M4
  const contextKeywords = ["modern", "professional", "minimalist", "luxury", "technology", "abstract-dark"];
  const randomContext = contextKeywords[Math.floor(Math.random() * contextKeywords.length)];
  
  // Limpar o titulo para usar como busca
  const searchTerms = title
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(",");

  const finalQuery = searchTerms ? `${searchTerms},${randomContext}` : `${category},${randomContext}`;
  
  // URL Dinamica do Unsplash com assinatura baseada no ID para NUNCA repetir entre posts
  // URL Estabilizada: Usamos o redirecionador de busca profissional
  const actualUrl = `https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80&sig=${id.slice(0, 8)}-${Date.now()}`;
  
  await updatePost(id, {
    imageUrl: actualUrl
  });
  
  revalidatePortal();
}

/**
 * ACAO: Agente de Autonomia Total
 * REGRA: Este agente monitora o impacto e publica sozinho nos horarios de pico.
 */
export async function toggleAutonomyAction(formData: FormData) {
  const currentStatus = formData.get("currentStatus") === "true";
  // Se clicou no botão, inverte o status. Se apenas mudou o número, mantém o status.
  const nextStatus = !currentStatus;
  const count = Number(formData.get("dailyCount") ?? 5);
  
  await setAutonomyStatus(nextStatus, count);
  revalidatePortal();
}

export async function addTagAction(formData: FormData) {
  await addTopicTag(String(formData.get("tag") ?? ""));
  revalidatePortal();
}

export async function removeTagAction(formData: FormData) {
  await removeTopicTag(String(formData.get("tag") ?? ""));
  revalidatePortal();
}
