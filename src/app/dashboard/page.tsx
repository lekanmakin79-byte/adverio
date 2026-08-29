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

            {/* Stats */}
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active campaigns"
                value="0"
                description="AI campaigns running"
                icon="✦"
              />

              <StatCard
                label="New leads"
                value="0"
                description="Enquiries captured"
                icon="♙"
              />

              <StatCard
                label="Follow-ups"
                value="0"
                description="Waiting for action"
                icon="↗"
              />

              <StatCard
                label="Content created"
                value="0"
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
                    href="/dashboard/content/new"
                    title="Create content"
                    description="Generate marketing content"
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

            {/* Automation */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                  Automation
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Your marketing automation journey
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Adverio will gradually automate the repetitive parts of your
                  customer acquisition process.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AutomationStep
                  number="01"
                  title="Attract"
                  description="AI creates campaigns and marketing content."
                  status="Ready"
                />

                <AutomationStep
                  number="02"
                  title="Capture"
                  description="Collect enquiries and potential customers."
                  status="Coming next"
                />

                <AutomationStep
                  number="03"
                  title="Follow up"
                  description="Automatically respond and follow up with leads."
                  status="Coming next"
                />

                <AutomationStep
                  number="04"
                  title="Convert"
                  description="Turn qualified leads into paying customers."
                  status="Coming next"
                />
              </div>
            </section>

            {/* Getting started */}
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Getting started
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Complete your first marketing campaign.
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Start with one service or offer. Adverio will use your
                  business profile to help create the campaign.
                </p>

                <Link
                  href="/dashboard/campaigns/new"
                  className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create your first campaign
                </Link>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                  Your AI advantage
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  Less marketing work. More consistency.
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Adverio is being built to help small businesses maintain
                  consistent marketing without needing a full-time marketing
                  team.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    AI campaigns
                  </span>

                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Lead capture
                  </span>

                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Follow-ups
                  </span>
                </div>
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
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
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
        <span className="text-2xl font-bold text-blue-100">{number}</span>

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
