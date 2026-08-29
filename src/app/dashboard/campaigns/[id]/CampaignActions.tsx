"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed";

export default function CampaignActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(
    newStatus: CampaignStatus,
  ) {
    setLoading(true);
    setError("");

    try {
      const result = await fetch(
        `/api/campaigns/${campaignId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const data = await result.json();

      if (!result.ok) {
        setError(
          data.error ||
            "Unable to update the campaign. Please try again.",
        );
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(
        "Campaign status update error:",
        err,
      );

      setError(
        "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this campaign? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const result = await fetch(
        `/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
        },
      );

      const data = await result.json();

      if (!result.ok) {
        setError(
          data.error ||
            "Unable to delete the campaign. Please try again.",
        );
        return;
      }

      router.push("/dashboard/campaigns");
      router.refresh();
    } catch (err) {
      console.error(
        "Campaign delete error:",
        err,
      );

      setError(
        "Something went wrong while deleting the campaign.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (status === "completed") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Campaign controls
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Campaign completed
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              This campaign has been completed and can no
              longer participate in automation.
            </p>
          </div>

          <button
            type="button"
            onClick={deleteCampaign}
            disabled={deleting}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "Deleting..."
              : "Delete Campaign"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5">
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
                onClick={() =>
                  updateStatus("active")
                }
                disabled={loading || deleting}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Activating..."
                  : "✓ Approve & Activate"}
              </button>
            )}

            {status === "active" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus("paused")
                }
                disabled={loading || deleting}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-500 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Pausing..."
                  : "Pause Campaign"}
              </button>
            )}

            {status === "paused" && (
              <button
                type="button"
                onClick={() =>
                  updateStatus("active")
                }
                disabled={loading || deleting}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Resuming..."
                  : "Resume Campaign"}
              </button>
            )}

            {(status === "draft" ||
              status === "paused") && (
              <button
                type="button"
                onClick={deleteCampaign}
                disabled={loading || deleting}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Campaign"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}