import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignActions from "./CampaignActions";

type Campaign = {
  id: string;
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
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Campaign details error:", error);
    notFound();
  }

  if (!campaign) {
    notFound();
  }

  const typedCampaign = campaign as Campaign;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/dashboard/campaigns"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to campaigns
        </Link>

        {/* Header */}
        <div className="mt-6 rounded-2xl bg-slate-950 p-7 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  ✦ Adverio AI
                </p>

                <StatusBadge status={typedCampaign.status} />
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                {typedCampaign.campaign_name}
              </h1>

              <p className="mt-4 max-w-3xl leading-7 text-slate-300">
                {typedCampaign.objective}
              </p>
            </div>

            <div className="shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {formatDate(typedCampaign.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Campaign strategy */}
        <section className="mt-8">
          <SectionHeading
            eyebrow="Campaign strategy"
            title="Your marketing plan"
          />

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <InfoCard
              title="Objective"
              content={typedCampaign.objective}
            />

            <InfoCard
              title="Target audience"
              content={typedCampaign.target_audience}
            />

            <InfoCard
              title="Call to action"
              content={typedCampaign.call_to_action}
            />
          </div>
        </section>

        {/* Key message */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="Core message"
            title="Key marketing message"
          />

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-base leading-7 text-slate-800">
              {typedCampaign.key_message}
            </p>
          </div>
        </section>

        {/* Social content */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="Social media"
            title="Generated social content"
          />

          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <ContentCard
              title="Facebook"
              content={typedCampaign.facebook_post}
            />

            <ContentCard
              title="Instagram"
              content={typedCampaign.instagram_post}
            />

            <ContentCard
              title="LinkedIn"
              content={typedCampaign.linkedin_post}
            />
          </div>
        </section>

        {/* Email */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="Email marketing"
            title="Generated email"
          />

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Subject
            </p>

            <h2 className="mt-2 text-lg font-bold text-slate-950">
              {typedCampaign.email_subject}
            </h2>

            <div className="my-5 h-px bg-slate-100" />

            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {typedCampaign.email_body}
            </div>
          </div>
        </section>

        {/* Follow-up */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="Lead follow-up"
            title="Follow-up message"
          />

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {typedCampaign.follow_up_message}
            </div>
          </div>
        </section>

        {/* Campaign controls */}
<section className="mt-10">
  <CampaignActions
    campaignId={typedCampaign.id}
    status={typedCampaign.status}
  />
</section>

        {/* Footer navigation */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-600"
          >
            ← All campaigns
          </Link>

          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ✦ Create another campaign
          </Link>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
    </div>
  );
}

function InfoCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-700">{content}</p>
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
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-950">{title}</h3>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {content}
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
    draft: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    paused: "border-slate-400/30 bg-slate-400/10 text-slate-300",
    completed: "border-blue-400/30 bg-blue-400/10 text-blue-300",
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
