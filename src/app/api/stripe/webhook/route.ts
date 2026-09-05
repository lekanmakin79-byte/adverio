import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  try {
    const payload = await request.text();
    const stripe = getStripe();

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    const supabaseAdmin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const userId =
          session.metadata?.supabase_user_id;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId) {
          console.error(
            "Stripe checkout session is missing supabase_user_id.",
          );
          break;
        }

        let subscription: Stripe.Subscription | null = null;

        if (subscriptionId) {
          subscription =
            await stripe.subscriptions.retrieve(
              subscriptionId,
            );
        }

        const firstItem =
          subscription?.items.data[0];

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id ?? null,
              stripe_subscription_id:
                subscription?.id ??
                subscriptionId ??
                null,
              stripe_price_id:
                firstItem?.price.id ??
                process.env.STRIPE_PRICE_ID ??
                null,
              plan: "pro",
              status:
                subscription?.status ??
                "active",
              current_period_end:
                firstItem?.current_period_end
                  ? new Date(
                      firstItem.current_period_end * 1000,
                    ).toISOString()
                  : null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        let userId =
          subscription.metadata?.supabase_user_id ??
          null;

        if (!userId) {
          const { data: existingSubscription } =
            await supabaseAdmin
              .from("subscriptions")
              .select("user_id")
              .eq(
                "stripe_customer_id",
                customerId,
              )
              .maybeSingle();

          userId =
            existingSubscription?.user_id ??
            null;
        }

        if (!userId) {
          console.error(
            "Unable to identify Supabase user for Stripe subscription:",
            subscription.id,
          );
          break;
        }

        const firstItem =
          subscription.items.data[0];

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id:
                subscription.id,
              stripe_price_id:
                firstItem?.price.id ?? null,
              plan:
                subscription.status === "active" ||
                subscription.status === "trialing"
                  ? "pro"
                  : "free",
              status: subscription.status,
              current_period_end:
                firstItem?.current_period_end
                  ? new Date(
                      firstItem.current_period_end * 1000,
                    ).toISOString()
                  : null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            current_period_end: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "stripe_subscription_id",
            subscription.id,
          );

        break;
      }

      case "invoice.paid": {
        const invoice =
          event.data.object as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          };

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: "pro",
              status: "active",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "stripe_subscription_id",
              subscriptionId,
            );
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice =
          event.data.object as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          };

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "stripe_subscription_id",
              subscriptionId,
            );
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 400 },
    );
  }
}