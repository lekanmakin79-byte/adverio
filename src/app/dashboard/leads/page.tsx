import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  follow_up_status: "pending" | "scheduled" | "sent" | "completed";
  created_at: string;
};

export default async function LeadsPage() {
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
            You need to be logged in to view your leads.
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

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, name, email, phone, message, source, status, follow_up_status, created_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lead library error:", error);
  }

  const leadList: Lead[] = leads ?? [];

  const newLeads = leadList.filter(
    (lead) => lead.status === "new",
  ).length;

  const contactedLeads = leadList.filter(
    (lead) => lead.status === "contacted",
  ).length;

  const qualifiedLeads = leadList.filter(
    (lead) => lead.status === "qualified",
  ).length;

  const convertedLeads = leadList.filter(
    (lead) => lead.status === "converted",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                ♙ Adverio Leads
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Leads
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Manage enquiries and potential customers captured by your
                marketing campaigns.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            We couldn't load your leads. Please refresh the page and try again.
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New leads" value={newLeads} />

          <StatCard label="Contacted" value={contactedLeads} />

          <StatCard label="Qualified" value={qualifiedLeads} />

          <StatCard label="Converted" value={convertedLeads} />
        </div>

        {/* Lead list */}
        <section className="mt-8">
          {leadList.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {leadList.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
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

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function LeadCard({
  lead,
}: {
  lead: Lead;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-950">
              {lead.name}
            </h2>

            <LeadStatusBadge status={lead.status} />
          </div>

          <div className="mt-3 flex flex-col gap-1 text-sm text-slate-600">
            {lead.email && (
              <span>
                <strong className="font-semibold text-slate-700">
                  Email:
                </strong>{" "}
                {lead.email}
              </span>
            )}

            {lead.phone && (
              <span>
                <strong className="font-semibold text-slate-700">
                  Phone:
                </strong>{" "}
                {lead.phone}
              </span>
            )}

            <span>
              <strong className="font-semibold text-slate-700">
                Source:
              </strong>{" "}
              {lead.source}
            </span>
          </div>

          {lead.message && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-700">
                {lead.message}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              Created {formatDate(lead.created_at)}
            </span>

            <span>
              Follow-up:{" "}
              <strong className="font-semibold text-slate-700">
                {formatFollowUpStatus(lead.follow_up_status)}
              </strong>
            </span>
          </div>
        </div>

        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
        >
          View Lead →
        </Link>
      </div>
    </article>
  );
}

function LeadStatusBadge({
  status,
}: {
  status: Lead["status"];
}) {
  const styles = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    contacted: "bg-amber-50 text-amber-700 border-amber-200",
    qualified: "bg-violet-50 text-violet-700 border-violet-200",
    converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-red-50 text-red-700 border-red-200",
  };

  const labels = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    converted: "Converted",
    lost: "Lost",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatFollowUpStatus(
  status: Lead["follow_up_status"],
) {
  const labels = {
    pending: "Pending",
    scheduled: "Scheduled",
    sent: "Sent",
    completed: "Completed",
  };

  return labels[status];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        ♙
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-950">
        No leads yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        When customers submit enquiries through your marketing system, they
        will appear here.
      </p>
    </div>
  );
}