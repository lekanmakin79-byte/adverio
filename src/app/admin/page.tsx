import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSubscriptionActions from "./AdminSubscriptionActions";

export default async function AdminPage() {
  const user = await requireAdmin();

  const supabaseAdmin = createAdminClient();

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "plan, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const {
    data: authUsersData,
    error: authUsersError,
  } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    console.error(
      "Admin users lookup error:",
      authUsersError,
    );
  }

  const authUsers = authUsersData?.users ?? [];

  const [
    { data: subscriptions },
    { data: campaigns },
    { data: leads },
    { data: customers },
  ] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan, status"),

    supabaseAdmin
      .from("campaigns")
      .select("owner_id"),

    supabaseAdmin
      .from("leads")
      .select("owner_id"),

    supabaseAdmin
      .from("customers")
      .select("owner_id"),
  ]);

  const subscriptionByUser = new Map(
    (subscriptions ?? []).map((item) => [
      item.user_id,
      {
        plan: item.plan ?? "free",
        status: item.status ?? "free",
      },
    ]),
  );

  const countByOwner = (
    rows: Array<{ owner_id: string | null }> | null,
  ) => {
    const counts = new Map<string, number>();

    for (const row of rows ?? []) {
      if (!row.owner_id) continue;

      counts.set(
        row.owner_id,
        (counts.get(row.owner_id) ?? 0) + 1,
      );
    }

    return counts;
  };

  const campaignCounts = countByOwner(campaigns);
  const leadCounts = countByOwner(leads);
  const customerCounts = countByOwner(customers);

  const now = Date.now();

  const thirtyDaysAgo =
    now - 30 * 24 * 60 * 60 * 1000;

  const users = authUsers.map((authUser) => {
    const subscriptionData =
      subscriptionByUser.get(authUser.id);

    const plan =
      subscriptionData?.plan === "pro"
        ? "pro"
        : "free";

    const status =
      authUser.banned_until &&
      new Date(authUser.banned_until).getTime() > now
        ? "Banned"
        : "Active";

    const createdAt =
      authUser.created_at
        ? new Date(authUser.created_at).getTime()
        : null;

    const lastSignInAt =
      authUser.last_sign_in_at
        ? new Date(authUser.last_sign_in_at).getTime()
        : null;

    return {
      id: authUser.id,
      email: authUser.email ?? "No email",
      createdAt: authUser.created_at,
      lastSignInAt: authUser.last_sign_in_at,
      plan,
      status,
      campaigns:
        campaignCounts.get(authUser.id) ?? 0,
      leads:
        leadCounts.get(authUser.id) ?? 0,
      customers:
        customerCounts.get(authUser.id) ?? 0,
      recentlyRegistered:
        createdAt !== null &&
        createdAt >= thirtyDaysAgo,
      recentlyActive:
        lastSignInAt !== null &&
        lastSignInAt >= thirtyDaysAgo,
    };
  });

  const totalUsers = users.length;

  const freeUsers = users.filter(
    (item) => item.plan === "free",
  ).length;

  const professionalUsers = users.filter(
    (item) => item.plan === "pro",
  ).length;

  const recentlyRegisteredUsers = users.filter(
    (item) => item.recentlyRegistered,
  ).length;

  const recentlyActiveUsers = users.filter(
    (item) => item.recentlyActive,
  ).length;

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "free";

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600">
            Adverio AI Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Admin & Stripe Test Subscription
          </h1>

          <p className="mt-2 text-gray-600">
            This area is restricted to the Adverio administrator.
            Stripe here is for test-mode subscription testing only.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Administrator
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Email:</span>{" "}
                {user.email}
              </p>

              <p>
                <span className="font-medium">Access:</span>{" "}
                <span className="font-semibold text-green-600">
                  Administrator
                </span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Current Subscription
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Plan:</span>{" "}
                <span className="font-semibold uppercase">
                  {plan}
                </span>
              </p>

              <p>
                <span className="font-medium">Status:</span>{" "}
                {status}
              </p>

              {subscription?.current_period_end && (
                <p>
                  <span className="font-medium">
                    Current period ends:
                  </span>{" "}
                  {new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Stripe Test Controls
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            These controls are available only to the administrator.
            Regular Adverio users remain in Free mode.
          </p>

          <AdminSubscriptionActions
            hasActiveSubscription={
              status === "active" ||
              status === "trialing"
            }
            hasCustomer={Boolean(
              subscription?.stripe_customer_id,
            )}
          />
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Administration
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                Users
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Read-only overview of Adverio accounts and their
                platform activity.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              No passwords, tokens, or private credentials are displayed.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Registered
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalUsers}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Free
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {freeUsers}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Professional
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {professionalUsers}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                New · 30 days
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {recentlyRegisteredUsers}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Active · 30 days
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {recentlyActiveUsers}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">
                    User
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Signup
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Last Login
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Plan
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Campaigns
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Leads
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Customers
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-4">
  <div className="font-medium text-gray-900">
    {item.email}
  </div>
</td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      {item.createdAt
                        ? new Date(
                            item.createdAt,
                          ).toLocaleDateString("en-GB")
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      {item.lastSignInAt
                        ? new Date(
                            item.lastSignInAt,
                          ).toLocaleDateString("en-GB")
                        : "Never"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                          item.plan === "pro"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.plan === "pro"
                          ? "Professional"
                          : "Free"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {item.campaigns}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {item.leads}
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-900">
                      {item.customers}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No registered users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">
            Test Mode
          </h2>

          <p className="mt-1 text-sm text-amber-800">
            Stripe paid functionality is currently restricted to
            the administrator. No paid subscription option is exposed
            to normal users.
          </p>
        </div>
      </div>
    </main>
  );
}