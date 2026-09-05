import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminEmail = process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const userEmail = user.email
    ?.trim()
    .toLowerCase();

  if (!adminEmail || !userEmail || userEmail !== adminEmail) {
    redirect("/dashboard");
  }

  return user;
}

export function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const userEmail = email
    ?.trim()
    .toLowerCase();

  return Boolean(
    adminEmail &&
      userEmail &&
      adminEmail === userEmail,
  );
}