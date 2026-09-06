import { getCurrentUserPlan } from "@/lib/subscription";

export type AdverioPlan = "free" | "pro";

export type AdverioFeature =
  | "ai_campaigns"
  | "content_generation"
  | "lead_management"
  | "follow_ups"
  | "customer_management"
  | "public_enquiries"
  | "basic_analytics"
  | "advanced_ai"
  | "advanced_automation"
  | "advanced_analytics";

export const FREE_FEATURES: AdverioFeature[] = [
  "ai_campaigns",
  "content_generation",
  "lead_management",
  "follow_ups",
  "customer_management",
  "public_enquiries",
  "basic_analytics",
];

export const PROFESSIONAL_FEATURES: AdverioFeature[] = [
  ...FREE_FEATURES,
  "advanced_ai",
  "advanced_automation",
  "advanced_analytics",
];

export function hasFeatureAccess(
  plan: AdverioPlan,
  feature: AdverioFeature,
) {
  if (plan === "pro") {
    return PROFESSIONAL_FEATURES.includes(feature);
  }

  return FREE_FEATURES.includes(feature);
}

export async function currentUserHasFeature(
  feature: AdverioFeature,
) {
  const plan = await getCurrentUserPlan();

  return hasFeatureAccess(plan, feature);
}