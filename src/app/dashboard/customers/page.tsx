import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Customer = {
  id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      `
        id,
        lead_id,
        name,
        email,
        phone,
        created_at,
        updated_at
      `,
    )
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Customers query error:", error);
  }

  const customerList: Customer[] = customers ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >
          ← Back to dashboard
        </Link>

        {/* Header */}
        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            ♙ Adverio Customers
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Customers
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Manage customers who have been converted from your
            marketing leads.
          </p>
        </div>

        {/* Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total customers
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {customerList.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Converted leads
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            We couldn't load your customers. Please refresh
            the page and try again.
          </div>
        )}

        {/* Customer list */}
        <section className="mt-8">
          {customerList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                ♙
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-950">
                No customers yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                When a qualified lead becomes a customer,
                the customer will appear here.
              </p>

              <Link
                href="/dashboard/leads"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View leads
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {customerList.map((customer) => (
                <article
                  key={customer.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-950">
                          {customer.name}
                        </h2>

                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Customer
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        {customer.email && (
                          <p>
                            <strong className="font-semibold text-slate-700">
                              Email:
                            </strong>{" "}
                            {customer.email}
                          </p>
                        )}

                        {customer.phone && (
                          <p>
                            <strong className="font-semibold text-slate-700">
                              Phone:
                            </strong>{" "}
                            {customer.phone}
                          </p>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-slate-400">
                        Customer since{" "}
                        {formatDate(customer.created_at)}
                      </p>
                    </div>

                    {customer.lead_id && (
                      <Link
                        href={`/dashboard/leads/${customer.lead_id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
                      >
                        View original lead →
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}