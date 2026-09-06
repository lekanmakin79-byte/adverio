import { createClient } from "@/lib/supabase/server";

export type UserPlan = "free" | "pro";

export async function getCurrentUserPlan(): Promise<UserPlan> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "free";
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Subscription lookup error:",
      error,
    );

    return "free";
  }

  const isProfessional =
    subscription?.plan === "pro" &&
    (
      subscription.status === "active" ||
      subscription.status === "trialing"
    );

  return isProfessional ? "pro" : "free";
}

export async function isProfessionalUser() {
  const plan = await getCurrentUserPlan();

  return plan === "pro";
}