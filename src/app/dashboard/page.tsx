import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardMobileMenu from "@/components/DashboardMobileMenu";
import BackToTop from "@/components/BackToTop";

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
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error("Dashboard business error:", businessError);
  }

  if (!business) {
    redirect("/onboarding");
  }

  /*
   * Load dashboard statistics from Supabase.
   *
   * These queries are all restricted to the currently
   * authenticated user's owner_id.
   */
  const [
    { count: activeCampaigns, error: activeCampaignsError },
    { count: newLeads, error: newLeadsError },
    { count: pendingFollowUps, error: pendingFollowUpsError },
    { data: campaigns, error: campaignsError },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "active"),

    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "new"),

    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "pending"),

    supabase
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
          follow_up_message
        `,
      )
      .eq("owner_id", user.id),
  ]);

  if (activeCampaignsError) {
    console.error(
      "Dashboard active campaigns error:",
      activeCampaignsError,
    );
  }

  if (newLeadsError) {
    console.error("Dashboard new leads error:", newLeadsError);
  }

  if (pendingFollowUpsError) {
    console.error(
      "Dashboard pending follow-ups error:",
      pendingFollowUpsError,
    );
  }

  if (campaignsError) {
    console.error("Dashboard content count error:", campaignsError);
  }

  const campaignList: Campaign[] = campaigns ?? [];

  /*
   * Count every generated content item that actually contains content.
   *
   * Each campaign can contain:
   * - Facebook post
   * - Instagram post
   * - LinkedIn post
   * - Email
   * - Follow-up message
   */
  const contentCreated = campaignList.reduce((total, campaign) => {
    let count = total;

    if (campaign.facebook_post?.trim()) {
      count += 1;
    }

    if (campaign.instagram_post?.trim()) {
      count += 1;
    }

    if (campaign.linkedin_post?.trim()) {
      count += 1;
    }

    if (campaign.email_body?.trim()) {
      count += 1;
    }

    if (campaign.follow_up_message?.trim()) {
      count += 1;
    }

    return count;
  }, 0);

  const firstName =
    user.user_metadata?.full_name?.split(" ")[0] ||
    business.business_name?.split(" ")[0] ||
    "there";

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
                    item.href === "/dashboard"
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
                    Dashboard
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
            {/* Welcome */}
            <section className="mb-8">
              <div className="rounded-2xl bg-slate-950 p-7 text-white sm:p-8">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-3 inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-blue-400">
                      ✦ AI Marketing Assistant
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Welcome, {firstName}.
                    </h2>

                    <p className="mt-3 leading-7 text-slate-300">
                      Your Adverio marketing workspace is ready. Create your
                      first AI-powered campaign and start building a system
                      that works for your business.
                    </p>
                  </div>

                  <Link
                    href="/dashboard/campaigns/new"
                    className="shrink-0 rounded-xl bg-blue-600 px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create AI Campaign
                  </Link>
                </div>
              </div>
            </section>

            {/* Dynamic stats */}
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active campaigns"
                value={String(activeCampaigns ?? 0)}
                description="AI campaigns running"
                icon="✦"
              />

              <StatCard
                label="New leads"
                value={String(newLeads ?? 0)}
                description="Enquiries captured"
                icon="♙"
              />

              <StatCard
                label="Follow-ups"
                value={String(pendingFollowUps ?? 0)}
                description="Waiting for action"
                icon="↗"
              />

              <StatCard
                label="Content created"
                value={String(contentCreated)}
                description="AI-generated content"
                icon="▤"
              />
            </section>

            {/* Main grid */}
            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              {/* AI assistant */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                      AI Assistant
                    </p>

                    <h2 className="mt-2 text-xl font-bold">
                      Your marketing system is ready.
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Tell Adverio what you want to promote and AI will help
                      create the campaign, messaging and follow-up strategy.
                    </p>
                  </div>

                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600 sm:flex">
                    ✦
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <QuickAction
                    href="/dashboard/campaigns/new"
                    title="Create campaign"
                    description="Generate an AI campaign"
                  />

                  <QuickAction
                    href="/dashboard/content"
                    title="View content"
                    description="Review marketing content"
                  />

                  <QuickAction
                    href="/dashboard/leads"
                    title="View leads"
                    description="Manage customer enquiries"
                  />
                </div>
              </div>

              {/* Business profile */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Business
                    </p>

                    <h2 className="mt-2 text-xl font-bold">
                      {business.business_name}
                    </h2>
                  </div>

                  <Link
                    href="/dashboard/settings"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  <ProfileRow
                    label="Industry"
                    value={business.industry}
                  />

                  <ProfileRow
                    label="Location"
                    value={business.location}
                  />

                  <ProfileRow
                    label="Marketing goal"
                    value={business.marketing_goal}
                  />
                </div>
              </div>
            </section>

            
{/* Automation journey */}
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div>
    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
      Automation
    </p>

    <h2 className="mt-2 text-xl font-bold text-slate-950">
      Your marketing automation journey
    </h2>

    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
      Adverio helps automate the repetitive parts of
      your customer acquisition process, from attracting
      prospects to converting them into customers.
    </p>
  </div>

  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    {/* 01 Attract */}
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          01
        </span>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ready
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        Attract
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        AI creates campaigns and marketing content to
        help attract potential customers.
      </p>
    </div>

    {/* 02 Capture */}
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          02
        </span>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ready
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        Capture
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Capture enquiries from your campaigns and public
        enquiry forms.
      </p>
    </div>

    {/* 03 Follow up */}
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          03
        </span>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ready
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        Follow up
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Generate AI responses and manage follow-up tasks
        for potential customers.
      </p>
    </div>

    {/* 04 Convert */}
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          04
        </span>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ready
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        Convert
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Convert qualified leads into customer records and
        continue managing the customer relationship.
      </p>
    </div>
  </div>
</section>


            
{/* Getting started */}
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div>
    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
      Getting started
    </p>

    <h2 className="mt-2 text-xl font-bold text-slate-950">
      Keep your marketing system moving.
    </h2>

    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
      Your Adverio workspace is already set up. Create
      campaigns, capture enquiries, follow up with
      prospects and turn successful leads into customers.
    </p>
  </div>

  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <Link
      href="/dashboard/campaigns/new"
      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      Create campaign
    </Link>

    <Link
      href="/dashboard/leads"
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
    >
      View leads
    </Link>

    <Link
      href="/dashboard/follow-ups"
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
    >
      View follow-ups
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

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
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

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
    >
      <p className="font-semibold text-slate-950">{title}</p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function AutomationStep({
  number,
  title,
  description,
  status,
}: {
  number: string;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-blue-100">
          {number}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            status === "Ready"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
