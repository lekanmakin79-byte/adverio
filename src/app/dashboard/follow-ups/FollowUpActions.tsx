"use client";

import { useState } from "react";

type Props = {
  followUpId: string;
  status: "pending" | "completed" | "cancelled";
};

export default function FollowUpActions({
  followUpId,
  status,
}: Props) {
  const [currentStatus, setCurrentStatus] =
    useState(status);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(
    newStatus: "completed" | "cancelled",
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/follow-ups/${followUpId}`,
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

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to update follow-up.",
        );
        return;
      }

      setCurrentStatus(newStatus);

      window.location.reload();
    } catch (error) {
      console.error(
        "Follow-up action error:",
        error,
      );

      setError(
        "Unable to update the follow-up. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus !== "pending") {
    return (
      <div className="mt-4">
        {currentStatus === "completed" && (
          <span className="inline-flex rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            ✓ Follow-up completed
          </span>
        )}

        {currentStatus === "cancelled" && (
          <span className="inline-flex rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">
            Follow-up cancelled
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            updateStatus("completed")
          }
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Updating..."
            : "✓ Mark completed"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            updateStatus("cancelled")
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel follow-up
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
