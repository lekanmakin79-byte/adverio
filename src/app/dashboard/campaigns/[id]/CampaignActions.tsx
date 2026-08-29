"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CampaignStatus = "draft" | "active" | "paused" | "completed";

export default function CampaignActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(newStatus: CampaignStatus) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .eq("owner_id", user.id);

      if (updateError) {
        console.error("Campaign status update error:", updateError);
        setError("Unable to update the campaign. Please try again.");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Campaign action error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "completed") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Campaign controls
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950">
            {status === "draft"
              ? "Ready to activate?"
              : status === "active"
                ? "Campaign is active"
                : "Campaign is paused"}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {status === "draft"
              ? "Review the generated content above. When you're happy with it, activate the campaign."
              : status === "active"
                ? "This campaign is approved and ready for the Adverio automation system."
                : "This campaign is currently paused and will not participate in automation."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          {status === "draft" && (
            <button
              type="button"
              onClick={() => updateStatus("active")}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Activating..." : "✓ Approve & Activate"}
            </button>
          )}

          {status === "active" && (
            <button
              type="button"
              onClick={() => updateStatus("paused")}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-500 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Pausing..." : "Pause Campaign"}
            </button>
          )}

          {status === "paused" && (
            <button
              type="button"
              onClick={() => updateStatus("active")}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Resuming..." : "Resume Campaign"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
