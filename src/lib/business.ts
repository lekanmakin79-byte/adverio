import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SELECTED_BUSINESS_COOKIE = "adverio_selected_business";

export async function getSelectedBusinessId(): Promise<string | null> {
  const cookieStore = await cookies();

  return (
    cookieStore.get(SELECTED_BUSINESS_COOKIE)?.value ??
    null
  );
}

export async function setSelectedBusinessId(
  businessId: string,
) {
  const cookieStore = await cookies();

  try {
    cookieStore.set(
      SELECTED_BUSINESS_COOKIE,
      businessId,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
  } catch {
    // Cookie writes may fail from Server Components.
    // Selection changes will be handled through a request context.
  }
}

export async function clearSelectedBusinessId() {
  const cookieStore = await cookies();

  try {
    cookieStore.delete(
      SELECTED_BUSINESS_COOKIE,
    );
  } catch {
    // Cookie deletion may fail from Server Components.
  }
}

export async function getCurrentBusiness() {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const selectedBusinessId =
    await getSelectedBusinessId();

  if (selectedBusinessId) {
    const {
      data: selectedBusiness,
      error: selectedBusinessError,
    } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", selectedBusinessId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (
      !selectedBusinessError &&
      selectedBusiness
    ) {
      return selectedBusiness;
    }
  }

  const {
    data: firstBusiness,
    error: firstBusinessError,
  } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (
    firstBusinessError ||
    !firstBusiness
  ) {
    return null;
  }

  return firstBusiness;
}

export async function getUserBusinesses() {
  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Failed to load businesses:",
      error,
    );

    return [];
  }

  return data ?? [];
}