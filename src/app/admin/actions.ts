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
  const topic = String(formData.get("title") ?? "tema editorial");
  
  // REGRA DE OURO: Geramos o conteudo sem salvar no DB para evitar duplicatas e timeouts
  const draft = await generateEditorialDraft({ 
    topic, 
    approach: "Refazer este artigo com profundidade total, tom premium e sem emojis." 
  });
  
  if (draft) {
    await updatePost(id, {
      content: draft.content,
      excerpt: draft.excerpt,
      imageUrl: draft.imageUrl,
      status: "review",
      reviewerNotes: "Conteudo refeito com IA (Turbo Mode). Revisado para PT-BR (Sem Emojis)."
    });
  }
  
  revalidatePortal();
}

export async function remakeImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const categorySlug = String(formData.get("categorySlug") ?? "tecnologia");
  
  // Array de palavras-chave baseadas no nicho M4
  const keywords = ["technology", "business", "finance", "data", "ai", "market", "office", "innovation"];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  
  // URL generica do Unsplash com seed aleatoria para forçar nova imagem
  const newImageUrl = `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=85&sig=${Date.now()}`.replace('1611974789855-9c2a0a7236a3', 'random'); 
  // Na verdade vamos usar a API do Unsplash Source ou params parecidos
  const actualUrl = `https://source.unsplash.com/1400x800/?${randomKeyword}&sig=${Date.now()}`;
  
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
  const nextStatus = !currentStatus;
  const count = Number(formData.get("dailyCount") ?? 5);
  
  // REGRA SOBERANA: Registro de troca de estado
  console.log(`[AUTONOMIA] Agente mudando de ${currentStatus} para ${nextStatus}. Meta: ${count}`);
  
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
