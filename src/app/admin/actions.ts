"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTopicTag, createDraft, deletePost, removeTopicTag, updatePost } from "@/lib/portal-cms";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";
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

export async function createDraftAction(formData: FormData) {
  await createDraft({
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    approach: String(formData.get("approach") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? "") || undefined
  });
  revalidatePortal();
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
  const draft = await createDraft({ topic, approach: "Refazer conteudo com profundidade e tom premium" });
  await updatePost(id, {
    content: draft.content,
    excerpt: draft.excerpt,
    imageUrl: draft.imageUrl,
    tags: draft.tags,
    status: "review",
    reviewerNotes: "Conteudo refeito automaticamente. Revisar antes de aprovar."
  });
  await deletePost(draft.id);
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
