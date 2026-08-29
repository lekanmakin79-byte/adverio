import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardMobileMenu from "@/components/DashboardMobileMenu";
import BackToTop from "@/components/BackToTop";

type Campaign = {
  id: string;
  campaign_name: string;
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
};

type Lead = {
  id: string;
  name: string | null;
  status: string | null;
  created_at: string;
};

type FollowUp = {
  id: string;
  status: string | null;
  due_at: string | null;
  created_at: string;
};

const navigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "AI Campaigns",
    href: "/dashboard/campaigns",
    icon: "✦",
  },
  {
    label: "Content",
    href: "/dashboard/content",
    icon: "▤",
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: "♙",
  },
  {
    label: "Follow-ups",
    href: "/dashboard/follow-ups",
    icon: "↗",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: "▥",
  },
];

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: business },
    { data: campaigns },
    { data: leads },
    { data: followUps },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle(),

    supabase
      .from("campaigns")
      .select("id, campaign_name, status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("leads")
      .select("id, name, status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("follow_ups")
      .select("id, status, due_at, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!business) {
    redirect("/onboarding");
  }

  const campaignList: Campaign[] = campaigns ?? [];
  const leadList: Lead[] = leads ?? [];
  const followUpList: FollowUp[] = followUps ?? [];

  const activeCampaigns = campaignList.filter(
    (campaign) => campaign.status === "active",
  ).length;

  const draftCampaigns = campaignList.filter(
    (campaign) => campaign.status === "draft",
  ).length;

  const pausedCampaigns = campaignList.filter(
    (campaign) => campaign.status === "paused",
  ).length;

  const completedCampaigns = campaignList.filter(
    (campaign) => campaign.status === "completed",
  ).length;

  const newLeads = leadList.filter(
    (lead) => normalizeStatus(lead.status) === "new",
  ).length;

  const contactedLeads = leadList.filter(
    (lead) => normalizeStatus(lead.status) === "contacted",
  ).length;

  const qualifiedLeads = leadList.filter(
    (lead) => normalizeStatus(lead.status) === "qualified",
  ).length;

  const convertedLeads = leadList.filter(
    (lead) => normalizeStatus(lead.status) === "converted",
  ).length;

  const lostLeads = leadList.filter(
    (lead) => normalizeStatus(lead.status) === "lost",
  ).length;

  const pendingFollowUps = followUpList.filter(
    (followUp) => normalizeStatus(followUp.status) !== "completed",
  ).length;

  const completedFollowUps = followUpList.filter(
    (followUp) => normalizeStatus(followUp.status) === "completed",
  ).length;

  const conversionRate =
    leadList.length > 0
      ? Math.round((convertedLeads / leadList.length) * 100)
      : 0;

  const contactRate =
    leadList.length > 0
      ? Math.round((contactedLeads / leadList.length) * 100)
      : 0;

  const qualificationRate =
    leadList.length > 0
      ? Math.round((qualifiedLeads / leadList.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-slate-200 px-6 py-6">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-slate-950"
              >
                Adverio<span className="text-blue-600">.</span>
              </Link>

              <p className="mt-1 text-xs text-slate-500">
                AI Marketing Automation
              </p>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-6">
              <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Workspace
              </p>

              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    item.href === "/dashboard/analytics"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md text-base">
                    {item.icon}
                  </span>

                  {item.label}
                </Link>
              ))}

              <div className="pt-6">
                <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account
                </p>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md text-base">
                    ⚙
                  </span>

                  Business Settings
                </Link>
              </div>
            </nav>

            <div className="border-t border-slate-200 p-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {business.business_name}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="border-b border-slate-200 bg-white">
            <div className="flex h-20 items-center justify-between px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <DashboardMobileMenu />

                <div>
                  <p className="text-sm text-slate-500 lg:hidden">
                    Adverio
                  </p>

                  <h1 className="text-xl font-bold text-slate-950">
                    Analytics
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/settings"
                  className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:block"
                >
                  Settings
                </Link>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
            {/* Header */}
            <section>
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

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  Marketing Analytics
                </h2>

                <p className="mt-3 max-w-2xl text-slate-600">
                  Understand your campaigns, leads and customer conversion
                  activity from one place.
                </p>
              </div>
            </section>

            {/* Overview stats */}
            <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total campaigns"
                value={campaignList.length}
                description={`${activeCampaigns} currently active`}
                icon="✦"
              />

              <MetricCard
                label="Total leads"
                value={leadList.length}
                description={`${newLeads} new enquiries`}
                icon="♙"
              />

              <MetricCard
                label="Conversion rate"
                value={`${conversionRate}%`}
                description={`${convertedLeads} converted leads`}
                icon="%"
              />

              <MetricCard
                label="Pending follow-ups"
                value={pendingFollowUps}
                description={`${completedFollowUps} completed`}
                icon="↗"
              />
            </section>

            {/* Campaign analytics */}
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Campaigns
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Campaign performance
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Current status of your AI marketing campaigns.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <ProgressRow
                    label="Active"
                    value={activeCampaigns}
                    total={campaignList.length}
                  />

                  <ProgressRow
                    label="Draft"
                    value={draftCampaigns}
                    total={campaignList.length}
                  />

                  <ProgressRow
                    label="Paused"
                    value={pausedCampaigns}
                    total={campaignList.length}
                  />

                  <ProgressRow
                    label="Completed"
                    value={completedCampaigns}
                    total={campaignList.length}
                  />
                </div>
              </div>

              {/* Conversion funnel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Lead funnel
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Lead conversion
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    See how enquiries move through your sales process.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <FunnelRow
                    label="New"
                    value={newLeads}
                    percentage={leadList.length ? 100 : 0}
                  />

                  <FunnelRow
                    label="Contacted"
                    value={contactedLeads}
                    percentage={contactRate}
                  />

                  <FunnelRow
                    label="Qualified"
                    value={qualifiedLeads}
                    percentage={qualificationRate}
                  />

                  <FunnelRow
                    label="Converted"
                    value={convertedLeads}
                    percentage={conversionRate}
                  />

                  <FunnelRow
                    label="Lost"
                    value={lostLeads}
                    percentage={
                      leadList.length
                        ? Math.round((lostLeads / leadList.length) * 100)
                        : 0
                    }
                  />
                </div>
              </div>
            </section>

            {/* Follow-ups */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Follow-ups
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Follow-up activity
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Keep track of outstanding and completed customer
                    follow-ups.
                  </p>
                </div>

                <Link
                  href="/dashboard/follow-ups"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View follow-ups →
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ActivityCard
                  label="Pending"
                  value={pendingFollowUps}
                  description="Follow-ups still requiring action"
                />

                <ActivityCard
                  label="Completed"
                  value={completedFollowUps}
                  description="Follow-ups successfully completed"
                />
              </div>
            </section>

            {/* Recent campaigns */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Campaign activity
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Recent campaigns
                  </h2>
                </div>

                <Link
                  href="/dashboard/campaigns"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all campaigns →
                </Link>
              </div>

              {campaignList.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
                  <p className="font-semibold text-slate-900">
                    No campaigns yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Create your first AI campaign to start generating
                    analytics.
                  </p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {campaignList.slice(0, 5).map((campaign) => (
                      <Link
                        key={campaign.id}
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {campaign.campaign_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Created {formatDate(campaign.created_at)}
                          </p>
                        </div>

                        <StatusBadge status={campaign.status} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Recent leads */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Lead activity
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Recent leads
                  </h2>
                </div>

                <Link
                  href="/dashboard/leads"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all leads →
                </Link>
              </div>

              {leadList.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
                  <p className="font-semibold text-slate-900">
                    No leads yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Leads captured through your campaigns will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {leadList.slice(0, 5).map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/dashboard/leads/${lead.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {lead.name || "Unnamed lead"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Added {formatDate(lead.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                          {lead.status || "Unknown"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Bottom CTA */}
            <section className="mt-8 rounded-2xl bg-slate-950 p-7 text-white sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-400">
                    ✦ Grow with Adverio
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Turn your marketing activity into measurable growth.
                  </h2>

                  <p className="mt-3 leading-7 text-slate-300">
                    Create campaigns, capture leads and follow up consistently
                    while using analytics to understand what is happening in
                    your marketing system.
                  </p>
                </div>

                <Link
                  href="/dashboard/campaigns/new"
                  className="shrink-0 rounded-xl bg-blue-600 px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create AI Campaign
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      <BackToTop />
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>

        <span className="text-sm font-semibold text-slate-950">
          {value}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-right text-xs text-slate-400">
        {percentage}%
      </p>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  percentage,
}: {
  label: string;
  value: number;
  percentage: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 shrink-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
          <div
            className="flex h-full items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-all"
            style={{ width: `${Math.max(percentage, value > 0 ? 8 : 0)}%` }}
          >
            {value > 0 ? value : ""}
          </div>
        </div>
      </div>

      <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-500">
        {percentage}%
      </span>
    </div>
  );
}

function ActivityCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
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

function normalizeStatus(status: string | null) {
  return status?.trim().toLowerCase().replace(/[\s-]+/g, "_") || "";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}