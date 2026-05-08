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


/**
 * savePostAction (Persistência Segura)
 * Salva as edições manuais feitas no painel. Inclui limpeza de asteriscos e proteção contra erros.
 */
export async function savePostAction(formData: FormData) {
  const id = String(formData.get("id"));
  let success = false;
  let errorMsg = "";

  try {
    // CAPTURA E VALIDAÇÃO DE DADOS
    const title = String(formData.get("title") ?? "").replace(/\*/g, '').trim();
    const content = String(formData.get("content") ?? "").replace(/\*/g, '').trim();
    const excerpt = String(formData.get("excerpt") ?? "").replace(/\*/g, '').trim();
    
    if (!id || !title) throw new Error("ID ou Título ausentes.");

    const updates: Partial<PortalPost> = {
      title,
      content,
      excerpt,
      slug: String(formData.get("slug") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      category: String(formData.get("category") ?? ""),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      priority: Number(formData.get("priority") ?? 50),
      scheduledAt: String(formData.get("scheduledAt") ?? "") || null,
      reviewerNotes: String(formData.get("reviewerNotes") ?? ""),
      isActive: formData.get("isActive") === "on"
    };

    await updatePost(id, updates);
    revalidatePortal();
    success = true;
  } catch (err: any) {
    console.error("[SALVAR] Erro crítico na persistência:", err);
    errorMsg = err.message;
  }

  if (success) {
    redirect("/admin?sucesso=salvo");
  } else {
    redirect(`/admin?erro=salvamento&msg=${encodeURIComponent(errorMsg)}`);
  }
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
  let success = false;
  let errorMsg = "";

  try {
    await updatePost(id, {
      status: "queued",
      content: "Limpando rascunho anterior e iniciando processamento de elite...",
      excerpt: "O Diretor de Arte e Redação IA está refazendo este artigo agora...",
      reviewerNotes: "⚠️ RESGATE EDITORIAL ATIVO: Gerando nova versão profunda (1200+ palavras) com inteligência visual v3.5."
    });
    
    revalidatePortal();
    success = true;
  } catch (err: any) {
    console.error("[RESGATE] Falha:", err);
    errorMsg = err.message;
  }

  if (success) {
    redirect("/admin?sucesso=resgate");
  } else {
    redirect(`/admin?erro=resgate&msg=${encodeURIComponent(errorMsg)}`);
  }
}

export async function remakeImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "");
  
  // EXTRAÇÃO DE INTELIGÊNCIA: Transformamos o título em palavras-chave de busca
  const keywords = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(",");

  const finalQuery = keywords || "business,technology";
  
  // Motor de Busca Inteligente com 'lock' único para evitar repetição
  const actualUrl = `https://loremflickr.com/1400/800/${finalQuery}/all?lock=${Date.now()}`;
  
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
  try {
    const currentStatus = formData.get("currentStatus") === "true";
    const nextStatus = !currentStatus;
    
    const dailyCount = Number(formData.get("dailyCount") ?? 5);
    const startTime = String(formData.get("startTime") ?? "08:00");
    const activeDays = formData.getAll("activeDays") as string[];

    await setAutonomyStatus(nextStatus, dailyCount, startTime, activeDays);
    revalidatePortal();
  } catch (err: any) {
    console.error("[AUTONOMIA] Erro ao configurar agente:", err);
    redirect(`/admin?erro=autonomia&msg=${encodeURIComponent(err.message)}`);
  }
}

export async function addTagAction(formData: FormData) {
  await addTopicTag(String(formData.get("tag") ?? ""));
  revalidatePortal();
}

export async function removeTagAction(formData: FormData) {
  await removeTopicTag(String(formData.get("tag") ?? ""));
  revalidatePortal();
}

/**
 * recordHitAction
 * Registra uma visita de p�gina de forma segura via Server Action.
 */
export async function recordHitAction(path: string) {
  try {
    await recordPageView(path);
    return { success: true };
  } catch (err) {
    console.error("[HIT] Erro ao registrar:", err);
    return { success: false };
  }
}
