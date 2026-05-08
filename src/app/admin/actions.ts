"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTopicTag, createQueuedPost, deletePost, removeTopicTag, updatePost, setAutonomyStatus, listPosts } from "@/lib/portal-cms";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import { generateEditorialDraft } from "@/lib/article-generator";
import type { PortalPost, PostStatus } from "@/lib/types";

/**
 * actions.ts
 * Server Actions responsáveis pelas mutações de dados no Portal M4.
 * Inclui: Autenticação, CRUD de Artigos (Modo Artesão), Controle do Agente e Tags.
 */

function revalidatePortal() {
  revalidatePath("/");
  revalidatePath("/portal-m4");
  revalidatePath("/admin");
}

/**
 * Autentica o administrador usando os dados do formulário e redireciona.
 */
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
  
  // Galeria Curada M4 - Apenas fotos de altíssimo nível (Tech, Finance, AI, Business)
  const premiumPhotos = [
    "photo-1519389950473-47ba0277781c", "photo-1485827404703-89b55fcc595e", 
    "photo-1460925895917-afdab827c52f", "photo-1590283603385-17ffb3a7f29f",
    "photo-1677442136019-21780ecad995", "photo-1620712943543-bcc4628c9759",
    "photo-1518770660439-4636190af475", "photo-1550751827-4bd374c3f58b",
    "photo-1454165205744-3b78555e5572", "photo-1507679799987-c7377ec48696",
    "photo-1531746790731-6c087fecd65a", "photo-1678382156212-f14013840242",
    "photo-1526374965328-7f61d4dc18c5", "photo-1551288049-bbbda546697a",
    "photo-1551434678-e076c223a692", "photo-1516321318423-f06f85e504b3",
    "photo-1535320903710-d993d3d77d29", "photo-1522071823991-b5ae77c4740e"
  ];

  const randomPhoto = premiumPhotos[Math.floor(Math.random() * premiumPhotos.length)];
  
  // Link direto e ultra-estável
  const actualUrl = `https://images.unsplash.com/${randomPhoto}?auto=format&fit=crop&w=1400&q=80&sig=${Date.now()}`;
  
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
