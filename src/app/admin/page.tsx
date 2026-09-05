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

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "free";

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
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