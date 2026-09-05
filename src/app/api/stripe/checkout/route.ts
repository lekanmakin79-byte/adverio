import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
	const stripe = getStripe();
	
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID is not configured." },
        { status: 500 },
      );
    }

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not configured." },
        { status: 500 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: existingSubscription } =
      await supabaseAdmin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

    let customerId =
      existingSubscription?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
          adverio_role: "admin",
        },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: customerId,
            plan: "free",
            status: "free",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url:
          `${siteUrl}/admin?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          `${siteUrl}/admin?stripe=cancelled`,
        metadata: {
          supabase_user_id: user.id,
          plan: "pro",
        },
        subscription_data: {
          metadata: {
            supabase_user_id: user.id,
            plan: "pro",
          },
        },
      });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe checkout error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Stripe checkout session.",
      },
      { status: 500 },
    );
  }
}