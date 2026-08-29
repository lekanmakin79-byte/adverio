import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Campaign = {
  id: string;
  campaign_name: string;
  objective: string;
  target_audience: string;
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
};

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">
            Please sign in
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            You need to be logged in to view your campaigns.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      "id, campaign_name, objective, target_audience, status, created_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Campaign library error:", error);
  }

  const campaignList: Campaign[] = campaigns ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              ← Back to dashboard
            </Link>

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                ✦ Adverio AI
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                AI Campaigns
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Create, review and manage your AI-powered marketing campaigns.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ✦ Create AI Campaign
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            We couldn't load your campaigns. Please refresh the page and try
            again.
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total campaigns"
            value={campaignList.length}
          />

          <StatCard
            label="Drafts"
            value={campaignList.filter((campaign) => campaign.status === "draft").length}
          />

          <StatCard
            label="Active"
            value={campaignList.filter((campaign) => campaign.status === "active").length}
          />

          <StatCard
            label="Completed"
            value={campaignList.filter((campaign) => campaign.status === "completed").length}
          />
        </div>

        {/* Campaign list */}
        <section className="mt-8">
          {campaignList.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {campaignList.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function CampaignCard({
  campaign,
}: {
  campaign: Campaign;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-950">
              {campaign.campaign_name}
            </h2>

            <StatusBadge status={campaign.status} />
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {campaign.objective}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>
              <strong className="font-semibold text-slate-700">
                Audience:
              </strong>{" "}
              {campaign.target_audience}
            </span>

            <span>
              <strong className="font-semibold text-slate-700">
                Created:
              </strong>{" "}
              {formatDate(campaign.created_at)}
            </span>
          </div>
        </div>

        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
        >
          View Campaign →
        </Link>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: Campaign["status"];
}) {
  const styles = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-slate-100 text-slate-600 border-slate-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const labels = {
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        ✦
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-950">
        No campaigns yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Create your first AI marketing campaign and let Adverio turn your
        business information into marketing content.
      </p>

      <Link
        href="/dashboard/campaigns/new"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Create your first campaign
      </Link>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}