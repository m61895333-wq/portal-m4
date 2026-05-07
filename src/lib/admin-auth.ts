import { cookies } from "next/headers";

const cookieName = "portal_m4_admin";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value === "authenticated";
}

export async function signInAdmin(formData: FormData) {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const expectedUser = process.env.PORTAL_M4_ADMIN_USER ?? "admin";
  const expectedPassword = process.env.PORTAL_M4_ADMIN_PASSWORD ?? "m4-2026";

  if (user !== expectedUser || password !== expectedPassword) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(cookieName, "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return true;
}

export async function signOutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}
