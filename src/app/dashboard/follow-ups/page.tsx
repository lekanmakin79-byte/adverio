import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import FollowUpActions from "./FollowUpActions";

type FollowUp = {
  id: string;
  lead_id: string;
  message: string | null;
  status: "pending" | "completed" | "cancelled";
  due_at: string;
  completed_at: string | null;
  created_at: string;
  lead: {
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
  } | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isDueToday(date: string) {
  const due = new Date(date);
  const today = new Date();

  return (
    due.getDate() === today.getDate() &&
    due.getMonth() === today.getMonth() &&
    due.getFullYear() === today.getFullYear()
  );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "cancelled":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return "Pending";
  }
}

export default async function FollowUpsPage() {
  const supabase = await createClient();

  // --------------------------------------------------
  // 1. Verify authentication
  // --------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // --------------------------------------------------
  // 2. Load follow-ups belonging to this user
  // --------------------------------------------------

  const { data, error } = await supabase
    .from("follow_ups")
    .select(
      `
        id,
        lead_id,
        message,
        status,
        due_at,
        completed_at,
        created_at,
        lead:leads (
          name,
          email,
          phone,
          message
        )
      `,
    )
    .eq("owner_id", user.id)
    .order("due_at", {
      ascending: true,
    });

  if (error) {
    console.error("Follow-ups query error:", error);
  }

  // --------------------------------------------------
  // 3. Normalise the Supabase relationship
  //
  // Supabase can return the related lead as an array.
  // The application uses one lead per follow-up, so
  // convert the first item into a single object.
  // --------------------------------------------------

  const items: FollowUp[] = (data ?? []).map((item) => {
    const relatedLead = Array.isArray(item.lead)
      ? item.lead[0] ?? null
      : item.lead ?? null;

    return {
      id: item.id,
      lead_id: item.lead_id,
      message: item.message,
      status: item.status as FollowUp["status"],
      due_at: item.due_at,
      completed_at: item.completed_at,
      created_at: item.created_at,
      lead: relatedLead,
    };
  });

  // --------------------------------------------------
  // 4. Summary statistics
  // --------------------------------------------------

  const pending = items.filter(
    (item) => item.status === "pending",
  );

  const completed = items.filter(
    (item) => item.status === "completed",
  );

  const dueTodayCount = pending.filter((item) =>
    isDueToday(item.due_at),
  ).length;

  // --------------------------------------------------
  // 5. Render page
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">

        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-500 transition hover:text-blue-600"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ↗ Adverio Follow-ups
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Follow-ups
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Keep track of leads that need a response
              and follow up at the right time.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          {/* Pending */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {pending.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Follow-ups waiting for action
            </p>
          </div>

          {/* Due today */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-blue-600">
              Due today
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {dueTodayCount}
            </p>

            <p className="mt-1 text-xs text-blue-500">
              Leads that need attention today
            </p>
          </div>

          {/* Completed */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-600">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {completed.length}
            </p>

            <p className="mt-1 text-xs text-emerald-500">
              Follow-ups already completed
            </p>
          </div>
        </div>

        {/* Follow-up list */}
        <section className="mt-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-600">
                ↗
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-950">
                No follow-ups yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                When you save an AI follow-up for a
                lead, it will appear here so you can
                keep track of your customer
                conversations.
              </p>

              <Link
                href="/dashboard/leads"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View leads
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* List header */}
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-bold text-slate-950">
                  Your follow-ups
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review and manage your customer
                  follow-up tasks.
                </p>
              </div>

              {/* Follow-up items */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const lead = item.lead;

                  const dueToday =
                    item.status === "pending" &&
                    isDueToday(item.due_at);

                  return (
                    <div
                      key={item.id}
                      className="p-6 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        {/* Lead information */}
                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">
                              {lead?.name || "Unknown lead"}
                            </h3>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                item.status,
                              )}`}
                            >
                              {getStatusLabel(item.status)}
                            </span>

                            {dueToday && (
                              <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                Due today
                              </span>
                            )}
                          </div>

                          {lead?.email && (
                            <p className="mt-2 break-all text-sm text-slate-500">
                              {lead.email}
                            </p>
                          )}

                          {lead?.phone && (
                            <p className="mt-1 text-sm text-slate-500">
                              {lead.phone}
                            </p>
                          )}

                          {lead?.message && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Original enquiry
                              </p>

                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                {lead.message}
                              </p>
                            </div>
                          )}

                          {item.message && (
                            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                                Follow-up message
                              </p>

                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                {item.message}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="w-full shrink-0 lg:w-44">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Due
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDate(item.due_at)}
                          </p>

                          <Link
                            href={`/dashboard/leads/${item.lead_id}`}
                            className="mt-4 inline-flex w-full justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
                          >
                            View lead →
                          </Link>

                          <div className="mt-2">
                            <FollowUpActions
                              followUpId={item.id}
                              status={item.status}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
