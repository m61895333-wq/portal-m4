"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addTopicTag,
  createQueuedPost,
  deletePost,
  removeTopicTag,
  updatePost,
  setAutonomyStatus,
  listPosts,
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
    const title = String(formData.get("title") || "").replace(/\*/g, "").trim();
    const content = String(formData.get("content") || "").replace(/\*/g, "").trim();
    const updates: Partial<PortalPost> = {
      title,
      content,
      excerpt: String(formData.get("excerpt") || "").replace(/\*/g, "").trim(),
      slug: String(formData.get("slug") || ""),
      imageUrl: String(formData.get("imageUrl") || ""),
      category: String(formData.get("category") || ""),
      tags: String(formData.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
      priority: Number(formData.get("priority") || 50),
      scheduledAt: String(formData.get("scheduledAt") || "") || null,
      isActive: formData.get("isActive") === "on"
    };
    await updatePost(id, updates);
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

export async function setStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PostStatus;
  await updatePost(id, {
    status,
    publishedAt: status === "approved" || status === "published" ? new Date().toISOString() : null
  });
  revalidatePortal();
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
      reviewerNotes: "RESGATE EDITORIAL ATIVO"
    });
    revalidatePortal();
    success = true;
  } catch (err) {}
  if (success) redirect("/admin?sucesso=resgate");
  else redirect("/admin?erro=resgate");
}

export async function remakeImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "tecnologia");

  // Extrai as palavras principais do titulo em portugues (filtra stopwords curtas)
  const cleanTitle = title
    .replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "")
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 6)
    .join(" ");

  // ESTILOS VISUAIS ROTATIVOS — garante que nenhuma imagem seja visualmente igual
  const VISUAL_STYLES = [
    "dark background neon cyan and violet accents, cyberpunk corporate, ultra sharp",
    "deep gold and obsidian premium luxury, volumetric light rays, photorealistic",
    "electric blue technology grid, holographic data streams, futuristic",
    "emerald green circuit board organic fusion, bioluminescent, 3d render",
    "crimson red and chrome metallic, high contrast dramatic lighting, editorial",
    "arctic white and steel blue minimalist, clean geometry, award winning",
    "deep purple galaxy cosmos, abstract financial data visualization, glowing",
    "amber orange sunrise gradient, premium business corporate, cinematic"
  ];

  // Seed ÚNICO: timestamp em ms + número aleatório — nunca se repete
  const uniqueSeed = Date.now() + Math.floor(Math.random() * 999983);
  // Estilo visual rotativo baseado no seed (distribuição uniforme)
  const visualStyle = VISUAL_STYLES[uniqueSeed % VISUAL_STYLES.length];

  // Prompt com estilo visual único e palavras-chave do título
  const prompt = encodeURIComponent(
    `Abstract conceptual 3d render about ${cleanTitle}, ${visualStyle}, no faces, no people, no text, ultra detailed, 8k resolution, award winning photography`
  );

  const actualUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1400&height=800&nologo=true&seed=${uniqueSeed}`;

  await updatePost(id, { imageUrl: actualUrl });
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
  } catch (err) {
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
  } catch (err) {
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

    if (error) console.error("[CONTATO] Erro no banco:", error.message);

    return { success: true };
  } catch (err) {
    console.error("[CONTATO] Falha:", err);
    return { success: false };
  }
}
