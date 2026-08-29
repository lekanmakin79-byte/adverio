import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MarketingAutomationControls from "@/components/MarketingAutomationControls";

type AutomationStatus =
  | "active"
  | "paused"
  | "completed";

type Automation = {
  id: string;
  campaign_id: string;
  status: AutomationStatus;
  frequency: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  campaigns:
    | {
        id: string;
        campaign_name: string;
        status: string;
      }
    | null;
};

type Campaign = {
  id: string;
  campaign_name: string;
  status: string;
};

export default async function MarketingAutomationPage() {
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
            You need to be logged in to view marketing automation.
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

  const [
    { data: automationData, error: automationError },
    { data: campaignData, error: campaignError },
  ] = await Promise.all([
    supabase
      .from("marketing_automations")
      .select(
        `
          id,
          campaign_id,
          status,
          frequency,
          start_date,
          end_date,
          created_at,
          campaigns (
            id,
            campaign_name,
            status
          )
        `,
      )
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("campaigns")
      .select(
        `
          id,
          campaign_name,
          status
        `,
      )
      .eq("owner_id", user.id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (automationError) {
    console.error(
      "Marketing automation dashboard error:",
      automationError,
    );
  }

  if (campaignError) {
    console.error(
      "Marketing automation campaign error:",
      campaignError,
    );
  }

  const automations =
    (automationData as Automation[] | null) ?? [];

  const campaigns =
    (campaignData as Campaign[] | null) ?? [];

  const activeCount = automations.filter(
    (automation) =>
      automation.status === "active",
  ).length;

  const pausedCount = automations.filter(
    (automation) =>
      automation.status === "paused",
  ).length;

  const completedCount = automations.filter(
    (automation) =>
      automation.status === "completed",
  ).length;

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
                ↗ Adverio AI
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Marketing Automation
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Schedule and manage marketing content generated from
                your AI campaigns.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            View AI Campaigns →
          </Link>
        </div>

        {/* Error */}
        {(automationError || campaignError) && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            We couldn't load all marketing automation data.
            Please refresh the page and try again.
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total automations"
            value={automations.length}
          />

          <StatCard
            label="Active"
            value={activeCount}
          />

          <StatCard
            label="Paused"
            value={pausedCount}
          />

          <StatCard
            label="Completed"
            value={completedCount}
          />
        </div>

        {/* Automation controls */}
        <section className="mt-10">
          <MarketingAutomationControls
            campaigns={campaigns}
            automations={automations.map(
              (automation) => ({
                id: automation.id,
                campaign_id: automation.campaign_id,
                status: automation.status,
                frequency: automation.frequency,
                start_date: automation.start_date,
                end_date: automation.end_date,
              }),
            )}
          />
        </section>

        {/* Automation list */}
        <section className="mt-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Your automations
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Marketing schedules
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review the campaigns connected to your marketing
              automation system.
            </p>
          </div>

          <div className="mt-5">
            {automations.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {automations.map((automation) => (
                  <AutomationCard
                    key={automation.id}
                    automation={automation}
                  />
                ))}
              </div>
            )}
          </div>
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
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function AutomationCard({
  automation,
}: {
  automation: Automation;
}) {
  const campaignName =
    automation.campaigns?.campaign_name ||
    "Campaign";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-950">
              {campaignName}
            </h3>

            <StatusBadge
              status={automation.status}
            />
          </div>

          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Frequency
              </p>

              <p className="mt-1 font-semibold capitalize text-slate-700">
                {automation.frequency}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Start date
              </p>

              <p className="mt-1 font-semibold text-slate-700">
                {formatDate(automation.start_date)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                End date
              </p>

              <p className="mt-1 font-semibold text-slate-700">
                {automation.end_date
                  ? formatDate(automation.end_date)
                  : "No end date"}
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/dashboard/campaigns/${automation.campaign_id}`}
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
  status: AutomationStatus;
}) {
  const styles = {
    active:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    paused:
      "border-amber-200 bg-amber-50 text-amber-700",
    completed:
      "border-blue-200 bg-blue-50 text-blue-700",
  };

  const labels = {
    active: "Active",
    paused: "Paused",
    completed: "Completed",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status]
      }`}
    >
      {labels[status]}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        ↗
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-950">
        No marketing automations yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Select one of your AI campaigns above to create your first
        marketing automation.
      </p>

      <Link
        href="/dashboard/campaigns"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        View campaigns
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