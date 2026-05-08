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
  const premiumPhotos = [
    "photo-1519389950473-47ba0277781c", "photo-1485827404703-89b55fcc595e", 
    "photo-1460925895917-afdab827c52f", "photo-1590283603385-17ffb3a7f29f",
    "photo-1677442136019-21780ecad995", "photo-1620712943543-bcc4628c9759",
    "photo-1642790106117-e829e14a795f", "photo-1556761175-b413da4baf72",
    "photo-1554224155-6726b3ff858f", "photo-1552664730-d307ca884978"
  ];
  const randomPhoto = premiumPhotos[Math.floor(Math.random() * premiumPhotos.length)];
  const actualUrl = `https://images.unsplash.com/${randomPhoto}?auto=format&fit=crop&w=1400&q=80`;
  await updatePost(id, { imageUrl: actualUrl });
  revalidatePortal();
}

export async function toggleAutonomyAction(formData: FormData) {
  try {
    const currentStatus = formData.get("currentStatus") === "true";
    const nextStatus = !currentStatus;
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
    const name = String(formData.get(\"name\") ?? \"\");
    const email = String(formData.get(\"email\") ?? \"\");
    const message = String(formData.get(\"message\") ?? \"\");
    
    // Registramos no banco de dados (tabela portal_contacts)
    // Se a tabela nao existir, o Supabase retornara erro, mas o fluxo nao trava.
    const { error } = await getSupabaseAdmin()
      .from(\"portal_contacts\")
      .insert({ name, email, message } as never);
      
    if (error) console.error(\"[CONTATO] Erro no banco:\", error.message);
    
    return { success: true };
  } catch (err) {
    console.error(\"[CONTATO] Falha:\", err);
    return { success: false };
  }
}
