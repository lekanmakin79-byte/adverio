"use client";

import { useState } from "react";

type CreativeStudioProps = {
  campaignId: string;
  campaignName: string;
  imageUrl: string | null;
};

export default function CreativeStudio({
  campaignId,
  campaignName,
  imageUrl: initialImageUrl,
}: CreativeStudioProps) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateCreative() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/creative`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to generate the marketing creative.",
        );
        return;
      }

      setImageUrl(data.imageUrl);
    } catch (requestError) {
      console.error(
        "Creative generation request error:",
        requestError,
      );

      setError(
        "Unable to generate the marketing creative. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-lg">
              🎨
            </span>

            <div>
              <h3 className="text-lg font-bold text-slate-950">
                Adverio Creative Studio
              </h3>

              <p className="text-sm text-slate-500">
                Create a branded marketing visual for this campaign.
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Generate a professional marketing creative from your existing
            campaign content. This first version uses Adverio's own
            zero-cost creative system — no paid image-generation API is
            required.
          </p>
        </div>

        {imageUrl && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Generated creative
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {campaignName}
              </p>
            </div>

            <div className="flex justify-center p-4 sm:p-6">
              <img
                src={imageUrl}
                alt={`Marketing creative for ${campaignName}`}
                className="h-auto w-full max-w-2xl rounded-xl border border-slate-200 shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Powered by Adverio AI
              </p>

              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
              >
                Open creative
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={generateCreative}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating marketing visual..."
              : imageUrl
                ? "Regenerate creative"
                : "Generate marketing creative"}
          </button>

          {!imageUrl && (
            <p className="text-xs text-slate-500">
              Zero API cost
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
