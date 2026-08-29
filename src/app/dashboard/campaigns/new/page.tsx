"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Campaign = {
  id: string;
  owner_id: string;
  campaign_name: string;
  objective: string;
  target_audience: string;
  key_message: string;
  call_to_action: string;
  facebook_post: string;
  instagram_post: string;
  linkedin_post: string;
  email_subject: string;
  email_body: string;
  follow_up_message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function NewCampaignPage() {
  const [promotion, setPromotion] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setCampaign(null);

    try {
      const response = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to generate campaign.");
        return;
      }

      setCampaign(data.campaign);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Unable to connect to the AI service. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              ✦ Adverio AI
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Create an AI marketing campaign
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Tell Adverio what you want to promote. AI will turn your
              business information into a complete marketing campaign.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="promotion"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              What do you want to promote?
            </label>

            <textarea
              id="promotion"
              required
              rows={6}
              maxLength={2000}
              value={promotion}
              onChange={(event) => setPromotion(event.target.value)}
              placeholder="For example: I want to promote our emergency electrical repair service to homeowners in my local area."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 leading-6 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Be specific about the service or offer.</span>
              <span>{promotion.length}/2000</span>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !promotion.trim()}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adverio AI is working..." : "Generate campaign"}
            </button>
          </form>
        </div>

        {campaign && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl bg-slate-950 p-7 text-white sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-400">
                Campaign generated
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {campaign.campaign_name}
              </h2>

              <p className="mt-4 leading-7 text-slate-300">
                {campaign.objective}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBox
                  label="Target audience"
                  value={campaign.target_audience}
                />

                <InfoBox
                  label="Call to action"
                  value={campaign.call_to_action}
                />
              </div>
            </div>

            <ContentCard
              title="Key message"
              content={campaign.key_message}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <ContentCard
                title="Facebook"
                content={campaign.facebook_post}
              />

              <ContentCard
                title="Instagram"
                content={campaign.instagram_post}
              />

              <ContentCard
                title="LinkedIn"
                content={campaign.linkedin_post}
              />

              <ContentCard
                title="Follow-up message"
                content={campaign.follow_up_message}
              />
            </div>

            <ContentCard
              title={`Email — ${campaign.email_subject}`}
              content={campaign.email_body}
            />

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="font-semibold text-emerald-900">
                ✦ Your first AI campaign has been generated.
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Next we'll save campaigns like this in Supabase and build the
                automation that turns them into an ongoing marketing system.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function ContentCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-950">{title}</h3>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {content}
      </div>
    </section>
  );
}
