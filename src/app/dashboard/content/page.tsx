import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BackToTop from "./BackToTop";
import CopyButton from "./CopyButton";

type Campaign = {
  id: string;
  campaign_name: string;
  status: "draft" | "active" | "paused" | "completed";
  facebook_post: string | null;
  instagram_post: string | null;
  linkedin_post: string | null;
  email_subject: string | null;
  email_body: string | null;
  follow_up_message: string | null;
  created_at: string;
};

export default async function ContentPage() {
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
            You need to be logged in to view your marketing content.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
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
      `
        id,
        campaign_name,
        status,
        facebook_post,
        instagram_post,
        linkedin_post,
        email_subject,
        email_body,
        follow_up_message,
        created_at
      `,
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Content library error:", error);
  }

  const campaignList: Campaign[] = campaigns ?? [];

  const contentItems = campaignList.flatMap((campaign) => [
    {
      id: `${campaign.id}-facebook`,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      type: "Facebook",
      content: campaign.facebook_post,
      createdAt: campaign.created_at,
    },
    {
      id: `${campaign.id}-instagram`,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      type: "Instagram",
      content: campaign.instagram_post,
      createdAt: campaign.created_at,
    },
    {
      id: `${campaign.id}-linkedin`,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      type: "LinkedIn",
      content: campaign.linkedin_post,
      createdAt: campaign.created_at,
    },
    {
      id: `${campaign.id}-email`,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      type: "Email",
      content: campaign.email_body
        ? `${campaign.email_subject || "Email"}\n\n${campaign.email_body}`
        : null,
      createdAt: campaign.created_at,
    },
    {
      id: `${campaign.id}-follow-up`,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      type: "Follow-up",
      content: campaign.follow_up_message,
      createdAt: campaign.created_at,
    },
  ]);

  const availableContent = contentItems.filter(
    (item) => item.content?.trim(),
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              ← Back to dashboard
            </Link>

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                ✦ Adverio AI
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Content Library
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                View and copy the marketing content generated from your AI
                campaigns.
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
            We couldn't load your content. Please refresh the page and try
            again.
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Campaigns"
            value={campaignList.length}
          />

          <StatCard
            label="Content pieces"
            value={availableContent.length}
          />

          <StatCard
            label="Platforms"
            value={5}
          />
        </div>

        {/* Content */}
        <section className="mt-8">
          {availableContent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {campaignList.map((campaign) => {
                const campaignContent = availableContent.filter(
                  (item) => item.campaignId === campaign.id,
                );

                if (campaignContent.length === 0) {
                  return null;
                }

                return (
                  <section
                    key={campaign.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-950">
                            {campaign.campaign_name}
                          </h2>

                          <StatusBadge status={campaign.status} />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          Created {formatDate(campaign.created_at)}
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
                      >
                        View campaign →
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      {campaignContent.map((item) => (
                        <ContentCard
                          key={item.id}
                          type={item.type}
                          content={item.content || ""}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>
	  
	   <BackToTop />
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

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ContentCard({
  type,
  content,
}: {
  type: string;
  content: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {type}
          </p>

          <h3 className="mt-1 text-base font-bold text-slate-950">
            {type === "Facebook"
              ? "Facebook post"
              : type === "Instagram"
                ? "Instagram post"
                : type === "LinkedIn"
                  ? "LinkedIn post"
                  : type === "Email"
                    ? "Email"
                    : "Follow-up message"}
          </h3>
        </div>

        <CopyButton content={content} />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
          {content}
        </p>
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
        No marketing content yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Create an AI campaign and your Facebook, Instagram, LinkedIn, email
        and follow-up content will appear here.
      </p>

      <Link
        href="/dashboard/campaigns/new"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
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