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
  const title = String(formData.get("title") || "");
  const keywords = title.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter(w => w.length > 3).slice(0, 3).join(",");
  const actualUrl = `https://loremflickr.com/1400/800/${keywords || "luxury"}/all?lock=${Date.now()}`;
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
