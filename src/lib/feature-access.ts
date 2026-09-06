import { redirect } from "next/navigation";
import {
  currentUserHasFeature,
  type AdverioFeature,
} from "@/lib/plans";

export async function requireFeature(
  feature: AdverioFeature,
) {
  const hasAccess = await currentUserHasFeature(feature);

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return true;
}

export async function checkFeatureAccess(
  feature: AdverioFeature,
) {
  return currentUserHasFeature(feature);
}